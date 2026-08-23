"use client";

import Link from "next/link";
import { SocialLink } from "@/lib/types";

const LABEL_ICON: Record<string, string> = {
  GitHub: "github",
  Email: "mail",
};

function socialHref(s: SocialLink): string {
  if (s.url) return s.url;
  return "#";
}

export function Footer({ socials }: { socials: SocialLink[] }) {
  const year = new Date().getFullYear();
  const links = socials.filter((s) => s.url);

  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 md:flex-row md:px-8">
        <p className="font-display text-base font-bold tracking-wide">
          Punja&nbsp;<span className="gold-text">Bhattarai</span>
        </p>

        <div className="flex items-center gap-3">
          {links.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-widest text-mute/60">
              Social links — edit in data/content.ts or admin settings
            </p>
          ) : (
            links.map((s) => (
              <a
                key={s.label}
                href={socialHref(s)}
                target={s.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                className="glass rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-mute transition-all hover:border-gold/50 hover:text-gold2"
              >
                {s.label}
              </a>
            ))
          )}
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/private-gallery"
            className="font-mono text-[11px] uppercase tracking-wider text-gold2/80 hover:text-gold2"
          >
            🔒 Private Gallery
          </Link>
          <Link
            href="/admin"
            className="font-mono text-[11px] uppercase tracking-wider text-mute/50 transition-colors hover:text-gold2/80"
            title="Admin login"
          >
            Admin
          </Link>
          <p className="font-mono text-[11px] text-mute/70">
            © {year} — Built with care
          </p>
        </div>
      </div>
    </footer>
  );
}
