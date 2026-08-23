"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Lightbox, LightboxPhoto } from "./Lightbox";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


interface GalleryPhoto extends LightboxPhoto {}
interface GalleryAlbum {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  photos: GalleryPhoto[];
}

type GateMode = { type: "guest" } | { type: "link"; slug: string };

export function PrivateGallery({ initialLink }: { initialLink?: string }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [permissions, setPermissions] = useState({ view: true, download: false });
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [busy, setBusy] = useState(false);

  const mode: GateMode = initialLink ? { type: "link", slug: initialLink } : { type: "guest" };

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery/photos");
      if (res.status === 401) {
        setAuthed(false);
        return false;
      }
      const data = await res.json();
      setAlbums(data.albums ?? []);
      if (data.permissions) setPermissions(data.permissions);
      setAuthed(true);
      return true;
    } catch {
      setError("Could not reach the server. Please retry.");
      return false;
    }
  }, []);

  useEffect(() => {
    fetch("/api/gallery/session")
      .then((r) => r.json())
      .then(async (d) => {
        if (d.authenticated) {
          if (d.permissions) setPermissions(d.permissions);
          if (d.expires_at) setExpiresAt(d.expires_at);
          await loadPhotos();
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [loadPhotos]);

  async function submitAccess(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const body =
        mode.type === "guest"
          ? {
              mode: "guest",
              access_name: String(fd.get("access_name") ?? ""),
              password: String(fd.get("password") ?? ""),
            }
          : {
              mode: "link",
              slug: mode.slug,
              password: String(fd.get("password") ?? ""),
            };
      const res = await fetch("/api/gallery/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 410) setExpiredNotice(true);
        setError(data.message ?? "Access denied.");
        return;
      }
      if (data.permissions) setPermissions(data.permissions);
      if (data.expires_at) setExpiresAt(data.expires_at);
      await loadPhotos();
    } catch {
      setError("Network error — please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/gallery/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
    setAlbums([]);
    setIndex(null);
  }

  const allPhotos = albums.flatMap((a) => a.photos);

  return (
    <div className="grain relative min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="font-display text-sm font-bold uppercase tracking-widest2 text-cream hover:text-gold2">
            ← Punja&nbsp;Bhattarai
          </a>
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-gold2">
            <Icon name="lock" className="h-4 w-4" />
            Private Gallery
            {authed && (
              <button onClick={logout} className="btn-ghost !border-line !px-4 !py-2 !text-[11px]">
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        {checking ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-label="Checking access" />
          </div>
        ) : !authed ? (
          /* ── Access gate ─────────────────────────────────── */
          <div className="mx-auto max-w-md py-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="glass rounded-3xl p-8 sm:p-10"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold2">
                <Icon name="lock" className="h-7 w-7" />
              </div>

              <h1 className="section-title !text-3xl">Protected gallery</h1>
              <p className="mt-3 text-sm leading-relaxed text-mute">
                {mode.type === "link"
                  ? "This shared gallery is protected. Enter the access password you received to continue."
                  : "Enter the guest access name and password you received to view these photos."}
              </p>

              <form onSubmit={submitAccess} className="mt-8 space-y-5">
                {mode.type === "guest" && (
                  <div>
                    <label htmlFor="g-name" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
                      Access name
                    </label>
                    <input id="g-name" name="access_name" required maxLength={100} className="input" placeholder="e.g. College Memories" />
                  </div>
                )}
                <div>
                  <label htmlFor="g-pass" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
                    Password
                  </label>
                  <input id="g-pass" name="password" type="password" required maxLength={200} autoComplete="off" className="input" placeholder="••••••••••••" />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {expiredNotice ? `${error} (code: expired)` : error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />
                      Verifying…
                    </>
                  ) : (
                    "Unlock Gallery"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-mute/60">
                Access is verified server-side · sessions expire automatically
              </p>
            </motion.div>
          </div>
        ) : (
          /* ── Authorized view ────────────────────────────── */
          <>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-label mb-3">Unlocked</p>
                <h1 className="section-title !text-4xl">
                  {allPhotos.length} photo{allPhotos.length === 1 ? "" : "s"}
                </h1>
                {expiresAt && (
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-mute">
                    Access valid until{" "}
                    {new Date(expiresAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              {!permissions.download && (
                <p className="badge badge-gray">View-only access</p>
              )}
            </div>

            {allPhotos.length === 0 ? (
              <div className="glass rounded-3xl px-8 py-16 text-center">
                <p className="font-display text-lg font-semibold">No photos here yet</p>
                <p className="mt-2 text-sm text-mute">
                  The owner hasn&apos;t added photos to this album yet.
                </p>
              </div>
            ) : (
              albums.map((album) => (
                <section key={album.id} className="mb-16">
                  <div className="mb-6 flex items-baseline gap-4">
                    <h2 className="font-display text-2xl font-bold">{album.name}</h2>
                    <span className="h-px flex-1 bg-line" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-mute">
                      {album.photos.length}
                    </span>
                  </div>
                  <div className="masonry">
                    {album.photos.map((photo) => {
                      const globalIndex = allPhotos.indexOf(photo);
                      return (
                        <button
                          key={photo.id}
                          onClick={() => setIndex(globalIndex)}
                          className="gallery-item masonry-item group relative block w-full overflow-hidden rounded-2xl text-left"
                          aria-label={`Open photo: ${photo.title || "untitled"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumb_url || photo.url}
                            alt={photo.title || "Private gallery photo"}
                            loading="lazy"
                            className="gallery-img w-full rounded-2xl"
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}

            {/* Download permission notice inside lightbox handled via canDownload */}
            <Lightbox
              photos={allPhotos}
              index={index}
              onClose={() => setIndex(null)}
              onIndexChange={setIndex}
              canDownload={permissions.download}
            />

            {!permissions.download && (
              <AnimatePresence>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-center font-mono text-[11px] uppercase tracking-widest text-mute/60"
                >
                  Downloads are disabled for your access level
                </motion.p>
              </AnimatePresence>
            )}
          </>
        )}
      </main>
    </div>
  );
}
