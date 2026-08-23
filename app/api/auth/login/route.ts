import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  createAdminToken,
  setSessionCookie,
  verifyPassword,
  ADMIN_COOKIE,
} from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = withGuard(async (req: NextRequest) => {
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");
  if (!supabaseConfigured())
    return jsonError(503, "not_configured", "Backend is not configured yet.");

  const rl = rateLimit(`login:${getClientIp(req)}`, 5, 60_000);
  if (!rl.ok)
    return jsonError(429, "rate_limited", `Too many attempts. Try again in ${rl.retryAfter}s.`);

  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success)
    return jsonError(400, "bad_request", "Please provide email and password.");

  const sb = getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, password_hash, display_name, token_version, role")
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();

  // Uniform error → no account enumeration.
  const fail = () => jsonError(401, "invalid_credentials", "Invalid email or password.");
  if (!profile || profile.role !== "admin") return fail();
  const ok = await verifyPassword(parsed.data.password, profile.password_hash);
  if (!ok) return fail();

  const { token, maxAge } = await createAdminToken({
    id: profile.id,
    email: profile.email,
    token_version: profile.token_version,
  });
  const res = jsonOk({
    ok: true,
    user: { email: profile.email, displayName: profile.display_name },
  });
  setSessionCookie(res, ADMIN_COOKIE, token, maxAge, req);
  return res;
});
