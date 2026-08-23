import { NextRequest } from "next/server";
import { PROFILE, SOCIALS, SKILLS, TIMELINE } from "@/data/content";
import { getSignedUrl } from "@/lib/storage";
import { jsonOk, withGuard } from "@/lib/http";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
};

interface ProjectRow {
  slug: string;
  title: string;
  description: string | null;
  long_description: string | null;
  technologies: string[] | null;
  features: string[] | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  image_path: string | null;
  status: string | null;
  featured: boolean | null;
}

/** Static asset paths start with "/" — storage paths get signed URLs. */
async function resolveImage(path: string | null): Promise<string> {
  if (!path) return "/images/placeholder.svg";
  if (path.startsWith("/")) return path;
  try {
    const url = await getSignedUrl(path);
    return url ?? "/images/placeholder.svg";
  } catch {
    return "/images/placeholder.svg";
  }
}

function mapProject(p: ProjectRow, image: string) {
  return {
    slug: p.slug,
    title: p.title,
    description: p.description ?? "",
    long_description: p.long_description ?? "",
    technologies: p.technologies ?? [],
    features: p.features ?? [],
    github_url: p.github_url ?? "",
    demo_url: p.demo_url ?? "",
    video_url: p.video_url ?? "",
    image,
    status: p.status ?? "completed",
    featured: !!p.featured,
  };
}

export const GET = withGuard(async (_req: NextRequest) => {
  if (!supabaseConfigured()) {
    return jsonOk({
      skills: SKILLS,
      timeline: TIMELINE,
      db: false,
      profile: PROFILE,
      socials: SOCIALS.filter((s) => s.url),
      projects: [],
      lab: [],
      albums: [],
    }, CACHE_HEADERS);
  }

  try {
    const sb = getSupabaseAdmin();

    const [settingsRes, projectsRes, labRes, albumsRes] = await Promise.all([
      sb.from("site_settings").select("key, value").in("key", ["profile", "socials", "assets"]),
      sb.from("projects").select("*").eq("category", "project").order("sort_order"),
      sb.from("projects").select("*").eq("category", "lab").order("sort_order"),
      sb
        .from("albums")
        .select("id, slug, name, description, visibility, cover_photo_id, sort_order")
        .eq("visibility", "public")
        .order("sort_order"),
    ]);

    const overrides = Object.fromEntries((settingsRes.data ?? []).map((r) => [r.key, r.value]));
    const profileOverride = (overrides.profile ?? {}) as Record<string, unknown>;

    // Compose the about bio array from admin-saved paragraphs.
    const bio1 = typeof profileOverride.aboutBio1 === "string" ? profileOverride.aboutBio1 : "";
    const bio2 = typeof profileOverride.aboutBio2 === "string" ? profileOverride.aboutBio2 : "";
    const aboutBio = [bio1, bio2].filter(Boolean);

    // Uploaded avatar/CV live in private storage → short-lived signed URLs.
    const assets = (overrides.assets ?? {}) as { avatar_path?: string; cv_path?: string };
    let avatarImage = String(profileOverride.avatarImage ?? PROFILE.avatarImage);
    let cvFile = String(profileOverride.cvFile ?? PROFILE.cvFile);
    if (assets.avatar_path) avatarImage = (await getSignedUrl(assets.avatar_path)) ?? avatarImage;
    if (assets.cv_path) cvFile = (await getSignedUrl(assets.cv_path)) ?? cvFile;

    const profile = {
      ...PROFILE,
      ...profileOverride,
      aboutBio: aboutBio.length ? aboutBio : PROFILE.aboutBio,
      avatarImage,
      cvFile,
    };

    const socialsRaw = Array.isArray(overrides.socials) ? overrides.socials : SOCIALS;

    const [projects, lab] = await Promise.all([
      Promise.all((projectsRes.data ?? []).map(async (p: ProjectRow) => mapProject(p, await resolveImage(p.image_path)))),
      Promise.all((labRes.data ?? []).map(async (p: ProjectRow) => mapProject(p, await resolveImage(p.image_path)))),
    ]);

    // Public album covers
    const coverIds = (albumsRes.data ?? []).map((a) => a.cover_photo_id).filter(Boolean) as string[];
    const covers: Record<string, string> = {};
    if (coverIds.length > 0) {
      const { data: coverPhotos } = await sb.from("photos").select("id, thumb_path").in("id", coverIds);
      for (const c of coverPhotos ?? []) {
        covers[c.id] = (await getSignedUrl(c.thumb_path)) ?? "";
      }
    }
    const albums = (albumsRes.data ?? []).map((a) => ({
      ...a,
      cover_url: a.cover_photo_id ? covers[a.cover_photo_id] || null : null,
    }));

    return jsonOk({
      skills: SKILLS,
      timeline: TIMELINE,
      db: true,
      profile,
      socials: socialsRaw.filter((s: { url?: string }) => !!s?.url),
      projects,
      lab,
      albums,
    }, CACHE_HEADERS);
  } catch {
    // Database unreachable → static defaults still render the site.
    return jsonOk({
      skills: SKILLS,
      timeline: TIMELINE,
      db: false,
      profile: PROFILE,
      socials: SOCIALS.filter((s) => s.url),
      projects: [],
      lab: [],
      albums: [],
    }, CACHE_HEADERS);
  }
});
