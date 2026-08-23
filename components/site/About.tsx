"use client";

import { PROFILE, TIMELINE } from "@/data/content";
import { Icon } from "./Icon";
import { Reveal, SectionHeading } from "./Reveal";

export function About() {
  return (
    <section id="about" className="relative mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading index="01" label="About" title="Behind the screen" />

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
        {/* Bio + focus */}
        <div>
          {PROFILE.aboutBio.map((p, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <p className="mb-5 text-lg leading-relaxed text-mute">{p}</p>
            </Reveal>
          ))}

          <Reveal delay={0.15}>
            <h3 className="mt-10 mb-4 font-display text-lg font-semibold">Current focus</h3>
          </Reveal>
          <div className="flex flex-wrap gap-2.5">
            {PROFILE.currentFocus.map((f, i) => (
              <Reveal key={f} delay={0.18 + i * 0.05}>
                <span className="glass rounded-full px-4 py-2 text-sm text-cream/90">{f}</span>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <h3 className="mt-10 mb-4 font-display text-lg font-semibold">Interests</h3>
          </Reveal>
          <div className="flex flex-wrap gap-2.5">
            {PROFILE.interests.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line px-4 py-1.5 text-sm text-mute transition-colors hover:border-gold/50 hover:text-gold2"
              >
                {t}
              </span>
            ))}
          </div>

          <Reveal delay={0.25}>
            <blockquote className="glass mt-12 rounded-2xl border-l-2 border-l-gold p-6 leading-relaxed text-cream/90">
              &ldquo;{PROFILE.philosophy}&rdquo;
            </blockquote>
          </Reveal>
        </div>

        {/* Timeline */}
        <div>
          <ol className="relative space-y-8 border-l border-line pl-8">
            {TIMELINE.map((t, i) => (
              <li key={t.title}>
                <Reveal delay={i * 0.1}>
                  <span
                    className="absolute -left-[7px] mt-2 h-3.5 w-3.5 rounded-full border-2 border-gold bg-ink"
                    aria-hidden
                  />
                  <article className="card-hover glass rounded-2xl p-6">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gold/80">
                      {t.year}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold">{t.title}</h3>
                    <p className="mt-0.5 text-sm text-gold2/80">{t.place}</p>
                    <p className="mt-3 text-sm leading-relaxed text-mute">{t.detail}</p>
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>

          <Reveal delay={0.3}>
            <a href={PROFILE.cvFile} download className="btn-ghost mt-8">
              <Icon name="download" className="h-4 w-4" />
              Download CV
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
