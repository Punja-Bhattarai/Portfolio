import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  generatePassword,
  getAdminUser,
  hashPassword,
} from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  accessRevokeSchema,
  guestCreateSchema,
  linkCreateSchema,
  slugify,
} from "@/lib/validation";

export const runtime = "nodejs";

// ── GET: list guests + shared links ───────────────────────────────
export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sb = getSupabaseAdmin();
  const [guestsRes, linksRes] = await Promise.all([
    sb.from("guest_access").select("*").order("created_at", { ascending: false }),
    sb.from("gallery_links").select("*").order("created_at", { ascending: false }),
  ]);
  if (guestsRes.error || linksRes.error)
    return jsonError(500, "server_error", "Could not load access entries.");
  return jsonOk({ guests: guestsRes.data ?? [], links: linksRes.data ?? [] });
});

// ── POST: create guest access or shared link ──────────────────────
export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const raw = await readJson<Record<string, unknown>>(req);
  const kind = raw?.kind;

  const sb = getSupabaseAdmin();

  if (kind === "guest") {
    const parsed = guestCreateSchema.safeParse(raw);
    if (!parsed.success) return jsonError(400, "bad_request", "Invalid guest payload.");
    const d = parsed.data;
    const password = generatePassword();
    const password_hash = await hashPassword(password);
    const expires_at = d.expires_days
      ? new Date(Date.now() + d.expires_days * 86400_000).toISOString()
      : null;
    const { data, error } = await sb
      .from("guest_access")
      .insert({
        name: d.name,
        password_hash,
        album_ids: d.album_ids,
        permissions: { view: true, download: d.download },
        expires_at,
      })
      .select("id, name, album_ids, permissions, expires_at, revoked, created_at")
      .single();
    if (error) return jsonError(500, "server_error", "Could not create guest access.");
    // The plaintext password is returned exactly once — only its hash is stored.
    return jsonOk({ ok: true, guest: data, generated_password: password });
  }

  if (kind === "link") {
    const parsed = linkCreateSchema.safeParse(raw);
    if (!parsed.success) return jsonError(400, "bad_request", "Invalid link payload.");
    const d = parsed.data;
    const base = slugify(d.name) || "gallery";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: existing } = await sb.from("gallery_links").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${base}-${i}`;
    }
    let generatedPassword: string | null = null;
    let password_hash: string | null = null;
    if (d.require_password) {
      generatedPassword = generatePassword();
      password_hash = await hashPassword(generatedPassword);
    }
    const expires_at = d.expires_days
      ? new Date(Date.now() + d.expires_days * 86400_000).toISOString()
      : null;
    const { data, error } = await sb
      .from("gallery_links")
      .insert({
        slug,
        name: d.name,
        album_id: d.album_id,
        require_password: d.require_password,
        password_hash,
        download_allowed: d.download_allowed,
        expires_at,
      })
      .select("*")
      .single();
    if (error) return jsonError(500, "server_error", "Could not create share link.");
    return jsonOk({ ok: true, link: data, generated_password: generatedPassword });
  }

  return jsonError(400, "bad_request", "Unknown access kind.");
});

// ── PATCH: revoke / restore ───────────────────────────────────────
export const PATCH = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const schema = z.object({
    kind: z.enum(["guest", "link"]),
    id: z.string().uuid(),
    action: z.enum(["revoke", "restore"]).default("revoke"),
  });
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid payload.");
  const { kind, id, action } = parsed.data;
  const revoked = action === "revoke";

  const sb = getSupabaseAdmin();
  const table = kind === "guest" ? "guest_access" : "gallery_links";
  const { error } = await sb.from(table).update({ revoked }).eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not update access.");

  if (revoked) {
    // Immediately kill any live sessions for this subject.
    await sb.from("gallery_sessions").update({ revoked: true }).eq("subject_type", kind).eq("subject_id", id);
  }
  return jsonOk({ ok: true });
});

// ── DELETE ────────────────────────────────────────────────────────
export const DELETE = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const schema = accessRevokeSchema;
  const kind = req.nextUrl.searchParams.get("kind");
  const id = req.nextUrl.searchParams.get("id");
  const parsed = schema.safeParse({ kind, id });
  if (!parsed.success) return jsonError(400, "bad_request", "Missing or invalid parameters.");

  const sb = getSupabaseAdmin();
  // Kill live sessions first so deleted entries lose access instantly.
  await sb
    .from("gallery_sessions")
    .update({ revoked: true })
    .eq("subject_type", parsed.data.kind)
    .eq("subject_id", parsed.data.id);

  const table = parsed.data.kind === "guest" ? "guest_access" : "gallery_links";
  const { error } = await sb.from(table).delete().eq("id", parsed.data.id);
  if (error) return jsonError(500, "server_error", "Could not delete entry.");
  return jsonOk({ ok: true });
});
