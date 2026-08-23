import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase";

export const MEDIA_BUCKET = "portfolio-media";
export const SIGNED_URL_TTL = 60 * 60; // 1 hour

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
  const sb = getSupabaseAdmin();
  const { data } = await sb.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export async function getSignedUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const sb = getSupabaseAdmin();
  const { data } = await sb.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && !("error" in item && item.error) && item.signedUrl) {
      out[item.path] = item.signedUrl;
    }
  }
  return out;
}
