import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase";

export const MEDIA_BUCKET = "portfolio-media";
export const SIGNED_URL_TTL = 60 * 60 * 24; // 24 hours

/**
 * Signed URLs are reused until near expiry so browsers can cache media
 * across page views instead of re-downloading on every request.
 */
const URL_CACHE = new Map<string, { url: string; exp: number }>();
const REFRESH_MARGIN_MS = 30 * 60 * 1000; // re-sign 30 min before expiry

function cacheGet(path: string): string | null {
  const hit = URL_CACHE.get(path);
  if (!hit) return null;
  if (Date.now() > hit.exp - REFRESH_MARGIN_MS) {
    URL_CACHE.delete(path);
    return null;
  }
  return hit.url;
}

function cacheSet(path: string, url: string): string {
  URL_CACHE.set(path, { url, exp: Date.now() + SIGNED_URL_TTL * 1000 });
  return url;
}

/** Drops cached signed URLs (call after overwriting an object at a stable path). */
export function invalidateSignedUrls(paths?: string[]): void {
  if (!paths) URL_CACHE.clear();
  else for (const p of paths) URL_CACHE.delete(p);
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function extensionForMime(mime: string): string | null {
  return ALLOWED_IMAGE_TYPES[mime] ?? null;
}

/** Verifies magic bytes so a renamed .exe cannot pass as an image. */
export function detectImageMime(buf: Uint8Array): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.length > 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

export async function uploadObject(
  path: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.storage
    .from(MEDIA_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function deleteObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const sb = getSupabaseAdmin();
  await sb.storage.from(MEDIA_BUCKET).remove(paths);
}

export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const cached = cacheGet(path);
  if (cached) return cached;
  const sb = getSupabaseAdmin();
  const { data } = await sb.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ? cacheSet(path, data.signedUrl) : null;
}

export async function getSignedUrls(
  paths: string[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    const cached = cacheGet(p);
    if (cached) out[p] = cached;
    else missing.push(p);
  }
  if (missing.length === 0) return out;
  const sb = getSupabaseAdmin();
  const { data } = await sb.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(missing, SIGNED_URL_TTL);
  for (const item of data ?? []) {
    if (item.path && !("error" in item && item.error) && item.signedUrl) {
      out[item.path] = cacheSet(item.path, item.signedUrl);
    }
  }
  return out;
}
