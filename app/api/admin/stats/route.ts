import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { jsonError, jsonOk, withGuard } from "@/lib/http";
import { getSignedUrls } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user) return jsonError(401, "unauthorized", "Please sign in.");

  const sb = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const [photosAll, photosPublic, albumsCount, unread, guestsRes, linksRes] =
    await Promise.all([
      sb.from("photos").select("id", { count: "exact", head: true }),
      sb.from("photos").select("id", { count: "exact", head: true }).eq("visibility", "public"),
      sb.from("albums").select("id", { count: "exact", head: true }),
      sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
      sb.from("guest_access").select("id, expires_at").eq("revoked", false),
      sb.from("gallery_links").select("id, expires_at").eq("revoked", false),
    ]);

  // active = not revoked AND (no expiry OR expiry in future)
  const notExpired = (row: { expires_at: string | null }) =>
    !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
  const guestsActive = (guestsRes.data ?? []).filter(notExpired).length;
  const linksActive = (linksRes.data ?? []).filter(notExpired).length;

  const [recentPhotosRes, recentMessagesRes] = await Promise.all([
    sb
      .from("photos")
      .select("id, title, filename, visibility, thumb_path, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    sb
      .from("contact_messages")
      .select("id, name, email, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentPhotoRows = recentPhotosRes.data ?? [];
  const thumbUrls = await getSignedUrls(recentPhotoRows.map((p) => p.thumb_path));

  return jsonOk({
    stats: {
      totalPhotos: photosAll.count ?? 0,
      publicPhotos: photosPublic.count ?? 0,
      privatePhotos: (photosAll.count ?? 0) - (photosPublic.count ?? 0),
      totalAlbums: albumsCount.count ?? 0,
      unreadMessages: unread.count ?? 0,
      guestAccessActive: guestsActive,
      sharedLinksActive: linksActive,
    },
    recentPhotos: recentPhotoRows.map((p) => ({
      id: p.id,
      title: p.title || p.filename,
      visibility: p.visibility,
      created_at: p.created_at,
      thumb_url: thumbUrls[p.thumb_path] ?? "",
    })),
    recentMessages: recentMessagesRes.data ?? [],
  });
});
