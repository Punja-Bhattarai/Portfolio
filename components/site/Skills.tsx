"use client";

import { SkillGroup } from "@/data/content";
import { Icon } from "./Icon";
import { Reveal, SectionHeading } from "./Reveal";

export function Skills({ groups }: { groups: SkillGroup[] }) {
  return (
    <section id="skills" className="relative py-28 md:py-36" aria-label="Skills">
      <div className="glow right-[-12%] top-[20%] h-[420px] w-[420px]" aria-hidden />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading index="02" label="Skills" title="Tools I work with" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {groups.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 0.07} className="h-full">
              <article className="card-hover glass group flex h-full flex-col rounded-2xl p-6">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold2 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <Icon name={g.icon} />
                </div>
                <h3 className="font-display text-lg font-semibold">{g.title}</h3>
                <ul className="mt-4 flex-1 space-y-3">
                  {g.skills.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-cream/90">{s.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
                        {s.level}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-mute/70">
            Levels reflect honest self-assessment — always learning.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
