import { NextRequest } from "next/server";
import { assertSameOrigin, getAdminUser } from "@/lib/auth";
import { jsonError, jsonOk, withGuard } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  deleteObjects,
  detectImageMime,
  extensionForMime,
  getSignedUrls,
  uploadObject,
} from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";
import { photoUpdateSchema, safeText } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_ORIGINAL_BYTES = 6 * 1024 * 1024; // compressed client-side before upload
const MAX_THUMB_BYTES = 1 * 1024 * 1024;

// ── GET: list / search photos ─────────────────────────────────────
export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sp = req.nextUrl.searchParams;
  const q = safeText(sp.get("q") ?? "").trim().replace(/[,()%]/g, "");
  const albumId = sp.get("album_id");
  const visibility = sp.get("visibility");
  const limit = Math.min(Number(sp.get("limit")) || 60, 200);

  const sb = getSupabaseAdmin();
  let query = sb
    .from("photos")
    .select("*, albums(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (q) query = query.or(`title.ilike.%${q}%,filename.ilike.%${q}%`);
  if (albumId === "none") query = query.is("album_id", null);
  else if (albumId) query = query.eq("album_id", albumId);
  if (visibility === "public" || visibility === "private")
    query = query.eq("visibility", visibility);

  const { data, error } = await query;
  if (error) return jsonError(500, "server_error", "Could not load photos.");

  const rows = data ?? [];
  const urls = await getSignedUrls([
    ...rows.map((p) => p.storage_path),
    ...rows.map((p) => p.thumb_path),
  ]);
  const photos = rows.map((p) => ({
    ...p,
    albums: undefined,
    album_name: (p as { albums?: { name: string } | null }).albums?.name ?? null,
    url: urls[p.storage_path] ?? "",
    thumb_url: urls[p.thumb_path] ?? "",
  }));
  return jsonOk({ photos });
});

// ── POST: upload a photo (multipart) ──────────────────────────────
export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");

  const rl = rateLimit(`upload:${getClientIp(req)}`, 60, 60_000);
  if (!rl.ok)
    return jsonError(429, "rate_limited", "Slow down — too many uploads.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "bad_request", "Invalid upload payload.");
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return jsonError(400, "bad_request", "No image file received.");
  if (file.size === 0 || file.size > MAX_ORIGINAL_BYTES)
    return jsonError(413, "file_too_large", "File too large. Max ~6 MB after compression.");

  const thumbFile = form.get("thumb");
  if (thumbFile instanceof File && thumbFile.size > MAX_THUMB_BYTES)
    return jsonError(413, "file_too_large", "Thumbnail unexpectedly large.");

  // Magic-byte validation (defence against mislabeled files)
  const headBuf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectImageMime(headBuf);
  if (!mime)
    return jsonError(415, "unsupported_type", "Only JPG, PNG and WEBP images are allowed.");

  const ext = extensionForMime(mime) ?? ".jpg";
  const title = safeText(form.get("title")).slice(0, 150);
  const description = safeText(form.get("description")).slice(0, 1000);
  const visibility = form.get("visibility") === "public" ? "public" : "private";
  const albumIdRaw = safeText(form.get("album_id"));
  const width = Math.max(0, Math.min(Number(form.get("width")) || 0, 20000));
  const height = Math.max(0, Math.min(Number(form.get("height")) || 0, 20000));

  const sb = getSupabaseAdmin();

  // Validate album if provided
  let albumId: string | null = null;
  if (albumIdRaw) {
    const { data: album } = await sb
      .from("albums")
      .select("id")
      .eq("id", albumIdRaw)
      .maybeSingle();
    if (!album)
      return jsonError(400, "bad_request", "Selected album does not exist.");
    albumId = album.id;
  }

  const photoId = crypto.randomUUID();
  const storagePath = `photos/${photoId}/original${ext}`;
  const thumbPath = `photos/${photoId}/thumb.webp`;

  try {
    await uploadObject(storagePath, await file.arrayBuffer(), mime);
    if (thumbFile instanceof File && thumbFile.size > 0) {
      const tHead = new Uint8Array(await thumbFile.slice(0, 16).arrayBuffer());
      const tMime = detectImageMime(tHead) ?? "image/webp";
      await uploadObject(thumbPath, await thumbFile.arrayBuffer(), tMime);
    } else {
      await uploadObject(thumbPath, await file.arrayBuffer(), mime); // fallback: reuse original
    }
  } catch (err) {
    await deleteObjects([storagePath, thumbPath]).catch(() => {});
    console.error("[upload]", err);
    return jsonError(500, "server_error", "Upload to storage failed. Please retry.");
  }

  const { data: inserted, error: insertErr } = await sb
    .from("photos")
    .insert({
      id: photoId,
      album_id: albumId,
      filename: file.name.slice(0, 200),
      storage_path: storagePath,
      thumb_path: thumbPath,
      title,
      description,
      visibility,
      width: width || null,
      height: height || null,
      size_bytes: file.size,
      mime_type: mime,
    })
    .select("id")
    .single();

  if (insertErr) {
    await deleteObjects([storagePath, thumbPath]).catch(() => {});
    return jsonError(500, "server_error", "Could not save photo metadata.");
  }

  return jsonOk({ ok: true, id: inserted.id });
});

// ── PATCH: update metadata ────────────────────────────────────────
export const PATCH = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = photoUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid update payload.");
  const { id, album_id, ...fields } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.visibility !== undefined) update.visibility = fields.visibility;
  if (album_id !== undefined) {
    if (album_id) {
      const sb0 = getSupabaseAdmin();
      const { data: album } = await sb0.from("albums").select("id").eq("id", album_id).maybeSingle();
      if (!album) return jsonError(400, "bad_request", "Album does not exist.");
    }
    update.album_id = album_id;
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("photos").update(update).eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not update photo.");
  return jsonOk({ ok: true });
});

// ── DELETE ────────────────────────────────────────────────────────
export const DELETE = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return jsonError(400, "bad_request", "Missing photo id.");

  const sb = getSupabaseAdmin();
  const { data: photo } = await sb
    .from("photos")
    .select("storage_path, thumb_path")
    .eq("id", id)
    .maybeSingle();
  if (!photo) return jsonError(404, "not_found", "Photo not found.");

  const { error } = await sb.from("photos").delete().eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not delete photo.");
  await deleteObjects([photo.storage_path, photo.thumb_path]).catch(() => {});
  return jsonOk({ ok: true });
});
