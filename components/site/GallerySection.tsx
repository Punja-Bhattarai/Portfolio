"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Lightbox, LightboxPhoto } from "./Lightbox";
import { Reveal, SectionHeading } from "./Reveal";

interface PublicPhoto extends LightboxPhoto {
  album_name: string | null;
}

export function GallerySection() {
  const [photos, setPhotos] = useState<PublicPhoto[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);

  // Lazy-load photos only when section approaches viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let loaded = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          loaded = true;
          observer.disconnect();
          fetch("/api/gallery/public")
            .then((r) => r.json())
            .then((d) => {
              setPhotos(d.photos ?? []);
              setConfigured(d.configured !== false);
            })
            .catch(() => setPhotos([]));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="gallery" ref={ref} className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading index="05" label="Gallery" title="Through my lens" />

      {photos === null ? (
        <div className="masonry">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`skeleton masonry-item rounded-2xl ${i % 3 === 0 ? "h-80" : i % 3 === 1 ? "h-56" : "h-64"}`}
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Reveal>
          <div className="glass rounded-3xl px-8 py-16 text-center">
            <p className="font-display text-lg font-semibold">No public photos yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
              {configured
                ? "Photos marked as public will appear here. Upload some in the admin dashboard."
                : "Connect Supabase and mark gallery photos public to display them here."}
            </p>
          </div>
        </Reveal>
      ) : (
        <>
          <div className="masonry">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIndex(i)}
                className="gallery-item masonry-item group relative block w-full overflow-hidden rounded-2xl text-left"
                aria-label={`Open photo: ${p.title || "untitled"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb_url || p.url}
                  alt={p.title || "Gallery photo"}
                  loading="lazy"
                  className="gallery-img w-full rounded-2xl"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="font-mono text-[11px] text-white/90">
                    {p.title || "Untitled"}
                  </span>
                  <Icon name="maximize" className="h-4 w-4 text-gold2" />
                </span>
              </button>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-10 text-center">
              <Link href="/private-gallery" className="btn-ghost">
                <Icon name="lock" className="h-4 w-4" />
                Looking for the private gallery?
              </Link>
            </div>
          </Reveal>
        </>
      )}

      <Lightbox photos={photos ?? []} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </section>
  );
}
