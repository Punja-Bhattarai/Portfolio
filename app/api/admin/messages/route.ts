import { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, getAdminUser } from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("contact_messages")
    .select("*")
    .order("read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return jsonError(500, "server_error", "Could not load messages.");
  return jsonOk({ messages: data ?? [] });
});

export const PATCH = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const schema = z.object({
    id: z.string().uuid(),
    read: z.boolean().optional(),
    read_all: z.boolean().optional(),
  });
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid payload.");

  const sb = getSupabaseAdmin();
  if (parsed.data.read_all) {
    await sb.from("contact_messages").update({ read: true }).eq("read", false);
    return jsonOk({ ok: true });
  }
  await sb
    .from("contact_messages")
    .update({ read: parsed.data.read ?? true })
    .eq("id", parsed.data.id);
  return jsonOk({ ok: true });
});

export const DELETE = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return jsonError(400, "bad_request", "Missing message id.");

  const sb = getSupabaseAdmin();
  await sb.from("contact_messages").delete().eq("id", id);
  return jsonOk({ ok: true });
});
