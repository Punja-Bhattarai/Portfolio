import { NextRequest } from "next/server";
import { getAdminUser, getGallerySession } from "@/lib/auth";
import { jsonOk, withGuard } from "@/lib/http";
import { getSignedUrls } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

interface PhotoRow {
  id: string;
  album_id: string;
  filename: string;
  title: string;
  description: string | null;
  storage_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
}

/**
 * Returns the albums + photos the current viewer (guest session, shared
 * link, or admin) is authorized to see, each photo carrying short-lived
 * signed URLs. Private originals are never exposed as permanent URLs.
 */
export const GET = withGuard(async (req: NextRequest) => {
  const sb = getSupabaseAdmin();

  const admin = await getAdminUser(req);
  const session = admin ? null : await getGallerySession(req);
  if (!admin && !session)
    return jsonOk({ authenticated: false }, { status: 401 });

  // Resolve album scope
  let albumIds: string[] | null = null; // null → everything
  if (!admin && session) {
    if (session.subject_type === "guest") {
      const { data: guest } = await sb
        .from("guest_access")
        .select("album_ids, revoked")
        .eq("id", session.subject_id)
        .single();
      if (!guest || guest.revoked)
        return jsonOk({ authenticated: false }, { status: 401 });
      albumIds = guest.album_ids ?? [];
    } else {
      const { data: link } = await sb
        .from("gallery_links")
        .select("album_id, revoked")
        .eq("id", session.subject_id)
        .single();
      if (!link || link.revoked)
        return jsonOk({ authenticated: false }, { status: 401 });
      albumIds = link.album_id ? [link.album_id] : [];
    }
    const scoped: string[] = albumIds ?? [];
    if (!scoped.length)
      return jsonOk({ authenticated: true, albums: [], permissions: session.permissions });
  }

  let albumsQuery = sb
    .from("albums")
    .select("id, slug, name, description")
    .order("sort_order");
  if (albumIds) albumsQuery = albumsQuery.in("id", albumIds);

  let photosQuery = sb
    .from("photos")
    .select("id, album_id, filename, title, description, storage_path, thumb_path, width, height")
    .order("created_at", { ascending: false })
    .limit(500);
  if (albumIds) photosQuery = photosQuery.in("album_id", albumIds);

  const [albumsRes, photosRes] = await Promise.all([albumsQuery, photosQuery]);

  const rows = (photosRes.data ?? []) as PhotoRow[];
  const urls = await getSignedUrls([
    ...rows.map((p) => p.storage_path),
    ...rows.map((p) => p.thumb_path),
  ]);

  const photosByAlbum: Record<string, object[]> = {};
  for (const p of rows) {
    if (!p.album_id) continue;
    (photosByAlbum[p.album_id] ||= []).push({
      ...p,
      url: urls[p.storage_path] ?? "",
      thumb_url: urls[p.thumb_path] ?? "",
    });
  }

  const scopeActive = !!albumIds;
  const albums = (albumsRes.data ?? [])
    .map((a) => ({ ...a, photos: photosByAlbum[a.id] ?? [] }))
    .filter((a) => a.photos.length > 0 || !scopeActive);

  return jsonOk({
    authenticated: true,
    permissions: admin ? { view: true, download: true } : session!.permissions,
    albums,
  });
});
