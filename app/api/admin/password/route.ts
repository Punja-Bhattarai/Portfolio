import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  createAdminToken,
  getAdminUser,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  ADMIN_COOKIE,
} from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(10).max(200),
});

export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success)
    return jsonError(400, "bad_request", "New password must be at least 10 characters.");

  const sb = (await import("@/lib/supabase")).getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, password_hash, token_version, display_name")
    .eq("id", user.id)
    .single();
  if (!profile) return jsonError(404, "not_found", "Account not found.");

  const ok = await verifyPassword(parsed.data.current_password, profile.password_hash);
  if (!ok) return jsonError(401, "invalid_credentials", "Current password is incorrect.");

  const newPasswordHash = await hashPassword(parsed.data.new_password);
  const newTokenVersion = profile.token_version + 1;
  const { error } = await sb
    .from("profiles")
    .update({ password_hash: newPasswordHash, token_version: newTokenVersion })
    .eq("id", profile.id);
  if (error) return jsonError(500, "server_error", "Could not change password.");

  // Re-issue the session cookie with the bumped token version; every other
  // device's session becomes invalid immediately.
  const { token, maxAge } = await createAdminToken({
    id: profile.id,
    email: profile.email,
    token_version: newTokenVersion,
  });
  const res = jsonOk({ ok: true, message: "Password updated. Other sessions were signed out." });
  setSessionCookie(res, ADMIN_COOKIE, token, maxAge, req);
  return res;
});
