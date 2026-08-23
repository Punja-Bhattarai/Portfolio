import { NextRequest } from "next/server";
import {
  assertSameOrigin,
  createGallerySession,
  GALLERY_COOKIE,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { galleryAccessSchema } from "@/lib/validation";

export const runtime = "nodejs";

const GENERIC_FAIL = () =>
  jsonError(401, "invalid_access", "Invalid access name or password.");
const EXPIRED = () =>
  jsonError(410, "expired", "This access has expired. Please ask the owner for new access.");

export const POST = withGuard(async (req: NextRequest) => {
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");
  if (!supabaseConfigured())
    return jsonError(503, "not_configured", "Backend is not configured yet.");

  const rl = rateLimit(`gallery-access:${getClientIp(req)}`, 10, 60_000);
  if (!rl.ok)
    return jsonError(429, "rate_limited", `Too many attempts. Try again in ${rl.retryAfter}s.`);

  const parsed = galleryAccessSchema.safeParse(await readJson(req));
  if (!parsed.success) return GENERIC_FAIL();
  const sb = getSupabaseAdmin();

  let permissions = { view: true, download: false };
  let subjectId: string;
  let expiresAt: Date | null = null;
  let name = "";
  let subjectType: "guest" | "link";

  if (parsed.data.mode === "guest") {
    subjectType = "guest";
    const { data: guest } = await sb
      .from("guest_access")
      .select("id, name, password_hash, permissions, expires_at, revoked")
      .ilike("name", parsed.data.access_name.trim())
      .maybeSingle();
    if (!guest || guest.revoked) return GENERIC_FAIL();
    if (guest.expires_at && new Date(guest.expires_at).getTime() < Date.now())
      return EXPIRED();
    const ok = await verifyPassword(parsed.data.password, guest.password_hash);
    if (!ok) return GENERIC_FAIL();

    permissions = guest.permissions ?? permissions;
    subjectId = guest.id;
    expiresAt = guest.expires_at ? new Date(guest.expires_at) : null;
    name = guest.name;
    void sb.from("guest_access").update({ last_used_at: new Date().toISOString() }).eq("id", guest.id);
  } else {
    subjectType = "link";
    const { data: link } = await sb
      .from("gallery_links")
      .select(
        "id, slug, password_hash, require_password, download_allowed, expires_at, revoked"
      )
      .eq("slug", parsed.data.slug.trim())
      .maybeSingle();
    if (!link || link.revoked || !link.id) return EXPIRED();
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
      return EXPIRED();
    if (link.require_password) {
      if (!link.password_hash || !parsed.data.password) return GENERIC_FAIL();
      const ok = await verifyPassword(parsed.data.password, link.password_hash);
      if (!ok) return GENERIC_FAIL();
    }
    permissions = { view: true, download: !!link.download_allowed };
    subjectId = link.id;
    expiresAt = link.expires_at ? new Date(link.expires_at) : null;
    name = `Link · ${link.slug}`;
    void sb.rpc("increment_gallery_link_view", { p_id: link.id });
  }

  const finalExpiry =
    expiresAt && expiresAt.getTime() > Date.now()
      ? expiresAt
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await createGallerySession({
    subjectType,
    subjectId,
    permissions,
    expiresAt: finalExpiry,
    name,
  });

  const res = jsonOk({
    ok: true,
    mode: subjectType,
    permissions,
    expires_at: finalExpiry.toISOString(),
  });
  setSessionCookie(res, GALLERY_COOKIE, session.token, session.maxAge, req);
  return res;
});
