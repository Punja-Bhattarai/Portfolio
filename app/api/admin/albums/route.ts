import { NextRequest } from "next/server";
import { assertSameOrigin, getAdminUser } from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { albumCreateSchema, albumUpdateSchema, slugify } from "@/lib/validation";

export const runtime = "nodejs";

// ── GET: list albums with photo counts ────────────────────────────
export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("albums")
    .select("*, photos!photos_album_id_fkey(count)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) return jsonError(500, "server_error", "Could not load albums.");

  const albums = (data ?? []).map((a) => ({
    ...a,
    photos: undefined,
    photo_count:
      Array.isArray((a as { photos?: { count?: number }[] }).photos)
        ? (a as { photos: { count?: number }[] }).photos.reduce(
            (n, r) => n + (r.count ?? 0),
            0
          )
        : 0,
  }));
  return jsonOk({ albums });
});

// ── POST: create album ────────────────────────────────────────────
export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = albumCreateSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "bad_request", "Album name is required (max 120 chars).");

  const sb = getSupabaseAdmin();
  const baseSlug = slugify(parsed.data.name) || "album";
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await sb.from("albums").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data, error } = await sb
    .from("albums")
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? "",
      visibility: parsed.data.visibility ?? "guest",
    })
    .select("*")
    .single();
  if (error)
    return jsonError(500, "server_error", "Could not create album. Did you run supabase/schema.sql?");
  return jsonOk({ ok: true, album: data });
});

// ── PATCH: rename / update ────────────────────────────────────────
export const PATCH = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = albumUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid update payload.");
  const { id, ...fields } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) update[k] = v;
  if ("name" in update && !String(update.name).trim())
    return jsonError(400, "bad_request", "Album name cannot be empty.");

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("albums").update(update).eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not update album.");
  return jsonOk({ ok: true });
});

// ── DELETE ────────────────────────────────────────────────────────
export const DELETE = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return jsonError(400, "bad_request", "Missing album id.");

  const sb = getSupabaseAdmin();
  // Photos keep existing (album_id → NULL via FK); cover refs cleared by FK too.
  const { error } = await sb.from("albums").delete().eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not delete album.");
  return jsonOk({ ok: true });
});
