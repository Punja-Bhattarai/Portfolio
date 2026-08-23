import { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, getAdminUser } from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import {
  deleteObjects,
  detectImageMime,
  extensionForMime,
  getSignedUrl,
  invalidateSignedUrls,
  uploadObject,
} from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_KEYS = new Set(["profile", "socials", "hero", "gallery"]);
const ASSET_KEY = "assets";

// ── GET: current settings ─────────────────────────────────────────
export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sb = getSupabaseAdmin();
  const { data } = await sb.from("site_settings").select("key, value");
  const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

  let avatar_url: string | null = null;
  let cv_url: string | null = null;
  try {
    if (settings[ASSET_KEY]?.avatar_path)
      avatar_url = await getSignedUrl(settings[ASSET_KEY].avatar_path);
    if (settings[ASSET_KEY]?.cv_path) cv_url = await getSignedUrl(settings[ASSET_KEY].cv_path);
  } catch {
    /* storage not ready */
  }

  return jsonOk({ settings: settings ?? {}, avatar_url, cv_url, admin: user });
});

// ── PUT: update text settings ─────────────────────────────────────
export const PUT = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const schema = z.object({ keys: z.record(z.string(), z.unknown()) });
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid settings payload.");

  const sb = getSupabaseAdmin();
  for (const [key, value] of Object.entries(parsed.data.keys)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const { error } = await sb
      .from("site_settings")
      .upsert({ key, value: value as object, updated_at: new Date().toISOString() });
    if (error) return jsonError(500, "server_error", `Could not save "${key}".`);
  }
  return jsonOk({ ok: true });
});

// ── POST: upload avatar or CV ─────────────────────────────────────
export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "bad_request", "Invalid upload.");
  }
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "bad_request", "No file received.");

  const sb = getSupabaseAdmin();

  if (kind === "avatar") {
    if (file.size > 2 * 1024 * 1024)
      return jsonError(413, "file_too_large", "Avatar must be under 2 MB.");
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const mime = detectImageMime(head);
    if (!mime)
      return jsonError(415, "unsupported_type", "Avatar must be JPG, PNG or WEBP.");
    const path = `assets/avatar${extensionForMime(mime)}`;
    await uploadObject(path, await file.arrayBuffer(), mime);
    invalidateSignedUrls([path]);
    // remove other-format leftovers
    for (const alt of ["assets/avatar.jpg", "assets/avatar.png", "assets/avatar.webp"]) {
      if (alt !== path) await deleteObjects([alt]).catch(() => {});
    }
    await sb
      .from("site_settings")
      .upsert({ key: ASSET_KEY, value: { ...(await currentAssets(sb)), avatar_path: path } });
    return jsonOk({ ok: true, url: await getSignedUrl(path) });
  }

  if (kind === "cv") {
    if (file.size > 10 * 1024 * 1024)
      return jsonError(413, "file_too_large", "CV must be under 10 MB.");
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
    if (!isPdf)
      return jsonError(415, "unsupported_type", "CV must be a PDF file.");
    const path = "assets/cv.pdf";
    await uploadObject(path, await file.arrayBuffer(), "application/pdf");
    invalidateSignedUrls([path]);
    await sb
      .from("site_settings")
      .upsert({ key: ASSET_KEY, value: { ...(await currentAssets(sb)), cv_path: path } });
    return jsonOk({ ok: true, url: await getSignedUrl(path) });
  }

  return jsonError(400, "bad_request", "Unknown asset kind.");
});

async function currentAssets(
  sb: ReturnType<typeof getSupabaseAdmin>
): Promise<Record<string, unknown>> {
  const { data } = await sb.from("site_settings").select("value").eq("key", ASSET_KEY).maybeSingle();
  return (data?.value as Record<string, unknown>) ?? {};
}
