import { NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { contactSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = withGuard(async (req: NextRequest) => {
  if (!assertSameOrigin(req))
    return jsonError(403, "forbidden", "Invalid request origin.");
  if (!supabaseConfigured())
    return jsonError(503, "not_configured", "Backend is not configured yet.");

  const rl = rateLimit(`contact:${getClientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok)
    return jsonError(429, "rate_limited", `Please wait ${rl.retryAfter}s before sending another message.`);

  const body = await readJson(req);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success || parsed.data.website)
    return jsonError(400, "bad_request", "Please fill in all fields correctly.");

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  });
  if (error) return jsonError(500, "server_error", "Could not send your message right now.");
  return jsonOk({ ok: true, message: "Message sent. Thank you!" });
});
