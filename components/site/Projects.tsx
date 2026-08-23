"use client";

import { useState } from "react";
import { DEFAULT_PROJECTS, ProjectDefault } from "@/data/content";
import { Icon } from "./Icon";
import { ProjectItem, ProjectModal } from "./ProjectModal";
import { Reveal, SectionHeading } from "./Reveal";

function toItem(p: ProjectDefault): ProjectItem {
  return {
    ...p,
    github_url: p.github_url || "",
    demo_url: p.demo_url || "",
    video_url: p.video_url || "",
  };
}

export function Projects({ projects }: { projects: ProjectItem[] }) {
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const list = projects.length > 0 ? projects : DEFAULT_PROJECTS.map(toItem);

  return (
    <section id="projects" className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading index="03" label="Projects" title="Selected work" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {list.map((p, i) => (
          <Reveal key={p.slug} delay={(i % 2) * 0.08}>
            <article
              className="card-hover glass group cursor-pointer overflow-hidden rounded-3xl"
              onClick={() => setSelected(p)}
              tabIndex={0}
              role="button"
              aria-label={`Open details for ${p.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(p);
                }
              }}
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={`${p.title} cover`}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent opacity-80" aria-hidden />
                <div className="absolute inset-x-5 bottom-4 flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-white drop-shadow-lg">{p.title}</h3>
                  <span className="glass rounded-full p-2 text-gold2 opacity-0 transition-all duration-500 group-hover:opacity-100">
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="p-6">
                <p className="line-clamp-2 text-sm leading-relaxed text-mute">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.technologies.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-mute"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
