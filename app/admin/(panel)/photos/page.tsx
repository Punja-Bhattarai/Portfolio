"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/site/Icon";
import { Lightbox } from "@/components/site/Lightbox";
import { Album, Photo, Visibility } from "@/lib/types";
import { api, ApiError, apiUpload, toast } from "@/lib/api";
import { processImage } from "@/lib/image-client";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface UploadJob {
  id: string;
  name: string;
  status: "queued" | "processing" | "uploading" | "done" | "error" | "skipped";
  progress: number;
  message?: string;
}

interface EditState {
  photo: Photo;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [q, setQ] = useState("");
  const [albumFilter, setAlbumFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<Visibility>("private");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (albumFilter) params.set("album_id", albumFilter);
    if (visibilityFilter) params.set("visibility", visibilityFilter);
    try {
      const d = await api<{ photos: Photo[] }>(`/api/admin/photos?${params}`);
      setPhotos(d.photos);
    } catch (e) {
      toast("error", (e as Error).message);
      setPhotos([]);
    }
  }, [q, albumFilter, visibilityFilter]);

  useEffect(() => {
    const t = setTimeout(loadPhotos, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadPhotos, q]);

  useEffect(() => {
    api<{ albums: Album[] }>("/api/admin/albums")
      .then((d) => setAlbums(d.albums))
      .catch(() => {});
  }, []);

  // ── Upload pipeline ────────────────────────────────────────────
  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const newJobs: UploadJob[] = list.map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      status: "queued",
      progress: 0,
    }));
    setJobs((prev) => [...newJobs, ...prev].slice(0, 12));

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const job = newJobs[i];
      const setJob = (patch: Partial<UploadJob>) =>
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...patch } : j)));

      try {
        setJob({ status: "processing", message: "Optimizing…" });
        let processed;
        try {
          processed = await processImage(file);
        } catch (err) {
          const msg = (err as Error).message;
          if (msg === "UNSUPPORTED_TYPE") throw new ApiError(415, "", "Unsupported type — use JPG, PNG or WEBP.");
          if (msg === "FILE_TOO_LARGE") throw new ApiError(413, "", "File too large — max 25 MB.");
          throw err;
        }

        setJob({ status: "uploading", message: `Uploading…` });
        const form = new FormData();
        form.append("file", new File([processed.original], file.name.replace(/\.\w+$/, "") + ".webp", { type: processed.original.type }));
        form.append("thumb", new File([processed.thumb], "thumb.webp", { type: processed.thumb.type }));
        form.append("title", file.name.replace(/\.\w+$/, "").slice(0, 150));
        form.append("description", "");
        form.append("visibility", uploadVisibility);
        if (uploadAlbum) form.append("album_id", uploadAlbum);
        form.append("width", String(processed.width));
        form.append("height", String(processed.height));

        await apiUpload("/api/admin/photos", form, (pct) => setJob({ progress: pct }));
        setJob({ status: "done", progress: 100, message: "Uploaded ✓" });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Upload failed.";
        setJob({ status: "error", message: msg });
      }
    }
    loadPhotos();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/admin/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edit.photo.id,
          title: String(fd.get("title") ?? ""),
          description: String(fd.get("description") ?? ""),
          visibility: fd.get("visibility"),
          album_id: fd.get("album_id") || null,
        }),
      });
      toast("success", "Photo updated.");
      setEdit(null);
      loadPhotos();
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function deletePhoto(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/photos?id=${id}`, { method: "DELETE" });
      toast("success", "Photo deleted.");
      setLightboxIndex(null);
      loadPhotos();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  async function toggleVisibility(photo: Photo) {
    try {
      await api("/api/admin/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: photo.id,
          visibility: photo.visibility === "public" ? "private" : "public",
        }),
      });
      loadPhotos();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  const activeJobs = jobs.filter((j) => j.status !== "done" && j.status !== "error");

  return (
    <div>
      <PageHeader
        title="Photos"
        subtitle="Upload, organise and publish gallery photos."
        action={
          <button className="btn-primary !px-5 !py-2.5 text-xs" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" className="h-4 w-4" /> Select files
          </button>
        }
      />

      {/* ── Dropzone + upload settings ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload photos — drag and drop or click to browse"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
            dragging ? "border-gold bg-gold/10" : "border-line bg-white/[0.02] hover:border-gold/50"
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onFilePick}
          />
          <span className={`mb-3 rounded-2xl p-3 ${dragging ? "bg-gold text-black" : "bg-gold/10 text-gold2"}`}>
            <Icon name="image" className="h-7 w-7" />
          </span>
          <p className="font-display font-semibold">Drag &amp; drop photos here</p>
          <p className="mt-1 text-xs text-mute">JPG · PNG · WEBP — auto-compressed &amp; thumbnailed in your browser</p>
        </div>

        <div className="glass space-y-4 rounded-2xl p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">New uploads</p>
          <div>
            <label htmlFor="up-vis" className="mb-1.5 block text-xs text-mute">Visibility</label>
            <select id="up-vis" value={uploadVisibility} onChange={(e) => setUploadVisibility(e.target.value as Visibility)} className="input">
              <option value="private">Private</option>
              <option value="public">Public (portfolio gallery)</option>
            </select>
          </div>
          <div>
            <label htmlFor="up-alb" className="mb-1.5 block text-xs text-mute">Album</label>
            <select id="up-alb" value={uploadAlbum} onChange={(e) => setUploadAlbum(e.target.value)} className="input">
              <option value="">No album</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Upload jobs ────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div className="glass mt-4 space-y-2 rounded-2xl p-4">
          {jobs.slice(0, 6).map((j) => (
            <div key={j.id} className="flex items-center gap-3 text-sm">
              <span className={`h-2 w-2 flex-none rounded-full ${j.status === "done" ? "bg-emerald-400" : j.status === "error" ? "bg-red-400" : "animate-pulse bg-gold"}`} aria-hidden />
              <span className="w-40 truncate">{j.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold2 transition-all duration-300" style={{ width: `${j.progress}%` }} />
              </div>
              <span className={`w-44 truncate text-right text-xs ${j.status === "error" ? "text-red-300" : "text-mute"}`}>
                {j.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Search by title or filename…" aria-label="Search photos" />
        <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} className="input sm:w-48" aria-label="Filter by album">
          <option value="">All albums</option>
          <option value="none">No album</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="input sm:w-40" aria-label="Filter by visibility">
          <option value="">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* ── Photo grid ─────────────────────────────────────── */}
      {photos === null ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-2xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="glass mt-6 rounded-3xl px-8 py-16 text-center">
          <p className="font-display text-lg font-semibold">No photos found</p>
          <p className="mt-2 text-sm text-mute">Upload your first photos using the dropzone above.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <figure key={p.id} className="card-hover glass group relative overflow-hidden rounded-2xl">
              <button onClick={() => setLightboxIndex(i)} className="block w-full" aria-label={`Preview ${p.title || p.filename}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url || p.url} alt={p.title || p.filename} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </button>

              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.title || p.filename}</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-wider text-mute">
                    {p.album_name ?? "no album"} · {p.visibility}
                  </p>
                </div>
                <div className="flex flex-none gap-1">
                  <button onClick={() => toggleVisibility(p)} title={p.visibility === "public" ? "Make private" : "Make public"} className="rounded-lg bg-white/10 p-1.5 backdrop-blur hover:text-gold2" aria-label="Toggle visibility">
                    <Icon name="lock" className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEdit({ photo: p })} title="Edit details" className="rounded-lg bg-white/10 p-1.5 backdrop-blur hover:text-gold2" aria-label="Edit photo">
                    <Icon name="edit" className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deletePhoto(p.id, p.title || p.filename)} title="Delete" className="rounded-lg bg-white/10 p-1.5 backdrop-blur hover:text-red-300" aria-label="Delete photo">
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </figcaption>

              <span className={`badge absolute left-2 top-2 ${p.visibility === "public" ? "badge-green" : "badge-gray"}`}>
                {p.visibility}
              </span>
            </figure>
          ))}
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────── */}
      {edit && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Edit photo">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEdit(null)} />
          <form onSubmit={saveEdit} className="glass relative w-full max-w-lg rounded-3xl bg-ink2/95 p-7">
            <h2 className="font-display text-xl font-bold">Edit photo</h2>
            <div className="mt-5 space-y-4">
              <img src={edit.photo.thumb_url || edit.photo.url} alt="" className="max-h-48 rounded-xl object-cover" aria-hidden />
              <div>
                <label htmlFor="e-title" className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mute">Title</label>
                <input id="e-title" name="title" defaultValue={edit.photo.title} maxLength={150} className="input" />
              </div>
              <div>
                <label htmlFor="e-desc" className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mute">Description / caption</label>
                <textarea id="e-desc" name="description" defaultValue={edit.photo.description ?? ""} rows={3} maxLength={1000} className="input resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="e-album" className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mute">Album</label>
                  <select id="e-album" name="album_id" defaultValue={edit.photo.album_id ?? ""} className="input">
                    <option value="">No album</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="e-vis" className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mute">Visibility</label>
                  <select id="e-vis" name="visibility" defaultValue={edit.photo.visibility} className="input">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEdit(null)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Save changes</button>
            </div>
          </form>
        </div>
      )}

      <Lightbox photos={(photos ?? []) as unknown as Parameters<typeof Lightbox>[0]['photos']} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} />
    </div>
  );
}
