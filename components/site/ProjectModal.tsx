"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { Icon } from "./Icon";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


export interface ProjectItem {
  slug: string;
  title: string;
  description: string;
  long_description?: string;
  technologies: string[];
  features: string[];
  github_url?: string;
  demo_url?: string;
  video_url?: string;
  image: string;
  status?: string;
}

export function ProjectModal({
  project,
  onClose,
}: {
  project: ProjectItem | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={false}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} details`}
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.article
            initial={reduce ? false : { y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { y: 60, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-ink2/90 sm:rounded-3xl"
          >
            <button
              onClick={onClose}
              aria-label="Close project details"
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-cream backdrop-blur transition-colors hover:text-gold2"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.image}
              alt={`${project.title} preview`}
              className="aspect-video w-full object-cover"
            />

            <div className="p-6 sm:p-8">
              <h3 className="font-display text-2xl font-bold sm:text-3xl">{project.title}</h3>

              {project.technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-[11px] text-gold2"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {(project.long_description || project.description) && (
                <p className="mt-5 leading-relaxed text-mute">
                  {project.long_description || project.description}
                </p>
              )}

              {project.features.length > 0 && (
                <>
                  <h4 className="mt-7 mb-3 font-display text-sm font-semibold uppercase tracking-widest text-cream/70">
                    Features
                  </h4>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {project.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-mute">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary !px-5 !py-2.5 text-xs"
                  >
                    <Icon name="github" className="h-4 w-4" /> GitHub
                  </a>
                ) : null}
                {project.demo_url ? (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-5 !py-2.5 text-xs"
                  >
                    <Icon name="external" className="h-4 w-4" /> Live Demo
                  </a>
                ) : null}
                {project.video_url ? (
                  <a
                    href={project.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-5 !py-2.5 text-xs"
                  >
                    <Icon name="play" className="h-4 w-4" /> Video Demo
                  </a>
                ) : null}
                {!project.github_url && !project.demo_url && !project.video_url && (
                  <span className="font-mono text-xs text-mute">
                    Links coming soon — this project is a work in progress.
                  </span>
                )}
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
