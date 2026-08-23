"use client";

import { useState } from "react";
import { DEFAULT_LAB, ProjectDefault } from "@/data/content";
import { Icon } from "./Icon";
import { ProjectItem, ProjectModal } from "./ProjectModal";
import { Reveal, SectionHeading } from "./Reveal";

const STATUS_STYLE: Record<string, string> = {
  "in-progress": "badge-gold",
  ongoing: "badge-green",
  paused: "badge-gray",
  completed: "badge-green",
  planned: "badge-gray",
};

function toItem(p: ProjectDefault): ProjectItem {
  return {
    ...p,
    github_url: p.github_url || "",
    demo_url: p.demo_url || "",
    video_url: p.video_url || "",
  };
}

export function LabSection({ experiments }: { experiments: ProjectItem[] }) {
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const list = experiments.length > 0 ? experiments : DEFAULT_LAB.map(toItem);

  return (
    <section id="lab" className="relative py-28 md:py-36" aria-label="Lab experiments">
      <div
        className="glow left-[-10%] bottom-[15%] h-[400px] w-[400px]"
        style={{ background: "radial-gradient(closest-side, rgba(94,201,167,0.1), transparent)" }}
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading index="04" label="The Lab" title="Experiments & prototypes" />

        <Reveal>
          <p className="-mt-6 mb-12 max-w-xl text-sm leading-relaxed text-mute">
            Smaller builds and open-ended playgrounds — where ideas get tested before they
            become projects.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => (
            <Reveal key={e.slug} delay={(i % 3) * 0.07} className="h-full">
              <article
                className="card-hover glass group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl"
                onClick={() => setSelected(e)}
                tabIndex={0}
                role="button"
                aria-label={`Open details for ${e.title}`}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setSelected(e);
                  }
                }}
              >
                <div className="relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.image}
                    alt={`${e.title} cover`}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className={`badge absolute left-4 top-4 ${STATUS_STYLE[e.status ?? ""] ?? "badge-gray"} backdrop-blur`}>
                    {(e.status ?? "experiment").replace("-", " ")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold">{e.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-mute">
                    {e.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-1.5 font-mono text-[10px] uppercase tracking-wider text-mute/80">
                      {e.technologies.slice(0, 3).map((t) => (
                        <span key={t} className="rounded border border-line px-2 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                    {e.demo_url ? (
                      <a
                        href={e.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="text-gold2 transition-transform hover:translate-x-0.5"
                        aria-label={`${e.title} demo`}
                      >
                        <Icon name="external" className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <ProjectModal project={selected} onClose={() => setSelected(null)} />
      </div>
    </section>
  );
}
