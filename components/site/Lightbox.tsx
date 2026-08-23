"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface LightboxPhoto {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  thumb_url?: string;
  width?: number | null;
  height?: number | null;
}

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  canDownload = true,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  canDownload?: boolean;
}) {
  const reduce = useReducedMotion();
  const [zoom, setZoom] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const open = index !== null && index >= 0 && index < photos.length;

  const next = useCallback(() => {
    if (index === null) return;
    setZoom(false);
    onIndexChange((index + 1) % photos.length);
  }, [index, photos.length, onIndexChange]);

  const prev = useCallback(() => {
    if (index === null) return;
    setZoom(false);
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, next, prev]);

  useEffect(() => setZoom(false), [index]);

  if (!open || index === null) return null;
  const photo = photos[index];

  const goFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        className="fixed inset-0 z-[100] flex flex-col bg-black/95"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Viewing ${photo.title || "photo"}`}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
          touchStartX.current = null;
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-mono text-xs text-white/60">
            {index + 1} / {photos.length}
            {photo.title ? ` — ${photo.title}` : ""}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom(!zoom)}
              aria-label={zoom ? "Zoom out" : "Zoom in"}
              className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-gold2"
            >
              <Icon name="zoomIn" className="h-5 w-5" />
            </button>
            {canDownload && photo.url && (
              <a
                href={photo.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download photo"
                className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-gold2"
              >
                <Icon name="download" className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={goFullscreen}
              aria-label="Toggle fullscreen"
              className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-gold2"
            >
              <Icon name="maximize" className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close viewer"
              className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-gold2"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-4 sm:px-20">
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 text-white/70 transition-all hover:bg-white/10 hover:text-gold2 sm:left-4"
          >
            <Icon name="chevronLeft" className="h-7 w-7" />
          </button>

          <AnimatePresence mode="wait">
            <motion.img
              key={photo.id}
              /* eslint-disable-next-line @next/next/no-img-element */
              src={photo.url}
              alt={photo.title || "Gallery photo"}
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`max-h-full max-w-full rounded-lg object-contain transition-transform duration-500 ${
                zoom ? "scale-[1.75] cursor-zoom-out" : "cursor-zoom-in"
              }`}
              onClick={() => setZoom(!zoom)}
            />
          </AnimatePresence>

          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 text-white/70 transition-all hover:bg-white/10 hover:text-gold2 sm:right-4"
          >
            <Icon name="chevronRight" className="h-7 w-7" />
          </button>
        </div>

        {photo.description && (
          <p className="pb-4 pt-1 text-center text-sm text-white/60">{photo.description}</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
