import { getSignedUrls } from "@/lib/storage";
import { jsonOk, withGuard } from "@/lib/http";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
};

interface PhotoRow {
  id: string;
  album_id: string | null;
  title: string;
  description: string | null;
  storage_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  albums: { name: string }[] | { name: string } | null;
}

export const GET = withGuard(async () => {
  if (!supabaseConfigured())
    return jsonOk({ photos: [], configured: false }, CACHE_HEADERS);

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("photos")
      .select("id, album_id, title, description, storage_path, thumb_path, width, height, albums!photos_album_id_fkey(name)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;

    const rows = (data ?? []) as unknown as PhotoRow[];
    const urls = await getSignedUrls([
      ...rows.map((p) => p.storage_path),
      ...rows.map((p) => p.thumb_path),
    ]);
    const photos = rows.map((p) => ({
      id: p.id,
      album_id: p.album_id,
      album_name:
        (Array.isArray(p.albums) ? p.albums[0]?.name : p.albums?.name) ?? null,
      title: p.title,
      description: p.description ?? "",
      url: urls[p.storage_path] ?? "",
      thumb_url: urls[p.thumb_path] ?? "",
      width: p.width,
      height: p.height,
    }));
    return jsonOk({ photos, configured: true }, CACHE_HEADERS);
  } catch (err) {
    console.error("[gallery/public]", err);
    return jsonOk({ photos: [], configured: false }, CACHE_HEADERS);
  }
});
