import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  getAdminUser,
} from "@/lib/auth";
import { jsonError, jsonOk, readJson, withGuard } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { projectCreateSchema, projectUpdateSchema, slugify, safeText } from "@/lib/validation";

export const runtime = "nodejs";

// ── GET: list projects (optionally by category) ───────────────────
export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const category = req.nextUrl.searchParams.get("type");
  const sb = getSupabaseAdmin();
  let query = sb.from("projects").select("*").order("sort_order");
  if (category === "project" || category === "lab") query = query.eq("category", category);
  const { data, error } = await query;
  if (error)
    return jsonError(500, "server_error", "Could not load projects. Did you run supabase/schema.sql?");
  return jsonOk({ projects: data ?? [] });
});

async function uniqueSlug(sb: ReturnType<typeof getSupabaseAdmin>, title: string, ignoreId?: string) {
  const base = slugify(title) || "project";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    let query = sb.from("projects").select("id").eq("slug", slug);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data: existing } = await query.maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }
  return slug;
}

function normalizeUrls(d: { github_url?: string; demo_url?: string; video_url?: string }) {
  return {
    github_url: d.github_url ?? "",
    demo_url: d.demo_url ?? "",
    video_url: d.video_url ?? "",
  };
}

// ── POST: create ──────────────────────────────────────────────────
export const POST = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = projectCreateSchema.safeParse(await readJson(req));
  if (!parsed.success)
    return jsonError(400, "bad_request", parsed.error.issues[0]?.message ?? "Invalid project payload.");
  const d = parsed.data;

  const sb = getSupabaseAdmin();
  const slug = await uniqueSlug(sb, d.title);
  const { data, error } = await sb
    .from("projects")
    .insert({
      title: d.title,
      slug,
      description: safeText(d.description),
      long_description: safeText(d.long_description ?? ""),
      technologies: d.technologies,
      features: d.features,
      ...normalizeUrls(d),
      image_path: d.image_path ?? "",
      category: d.category,
      status: d.status,
      featured: d.featured,
      sort_order: d.sort_order,
    })
    .select("*")
    .single();
  if (error) return jsonError(500, "server_error", "Could not create project.");
  return jsonOk({ ok: true, project: data });
});

// ── PATCH: update ─────────────────────────────────────────────────
export const PATCH = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const parsed = projectUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success)
    return jsonError(400, "bad_request", parsed.error.issues[0]?.message ?? "Invalid project payload.");
  const { id, ...fields } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (["description", "long_description"].includes(k)) update[k] = safeText(v);
    else update[k] = v;
  }
  if (typeof update.github_url !== "string") delete update.github_url;

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("projects").update(update).eq("id", id);
  if (error) return jsonError(500, "server_error", "Could not update project.");
  return jsonOk({ ok: true });
});

// ── DELETE ────────────────────────────────────────────────────────
export const DELETE = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");
  if (!assertSameOrigin(req)) return jsonError(403, "forbidden", "Invalid request origin.");

  const id = req.nextUrl.searchParams.get("id");
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return jsonError(400, "bad_request", "Missing project id.");

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("projects").delete().eq("id", parsed.data);
  if (error) return jsonError(500, "server_error", "Could not delete project.");
  return jsonOk({ ok: true });
});
