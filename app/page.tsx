"use client";

import { useEffect, useState } from "react";
import { About } from "@/components/site/About";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LabSection } from "@/components/site/LabSection";
import { Navbar } from "@/components/site/Navbar";
import { Projects } from "@/components/site/Projects";
import { Skills } from "@/components/site/Skills";
import { GallerySection } from "@/components/site/GallerySection";
import {
  DEFAULT_LAB,
  DEFAULT_PROJECTS,
  PROFILE,
  SKILLS,
  SOCIALS,
  ProjectDefault,
} from "@/data/content";
import { SocialLink } from "@/lib/types";

interface ContentResponse {
  profile: typeof PROFILE;
  socials: SocialLink[];
  projects: ProjectDefault[];
  lab: ProjectDefault[];
  db: boolean;
}

export default function HomePage() {
  const [content, setContent] = useState<ContentResponse>({
    profile: PROFILE,
    socials: SOCIALS,
    projects: DEFAULT_PROJECTS,
    lab: DEFAULT_LAB,
    db: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        setContent({
          profile: { ...PROFILE, ...(d.profile ?? {}) },
          socials: (d.socials?.length ? d.socials : SOCIALS) as SocialLink[],
          projects: (d.projects?.length ? d.projects : DEFAULT_PROJECTS) as ProjectDefault[],
          lab: (d.lab?.length ? d.lab : DEFAULT_LAB) as ProjectDefault[],
          db: !!d.db,
        });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  return (
    <div className="grain relative">
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <Navbar />
      <main>
        <Hero avatar={content.profile.avatarImage} />
        <About />
        <Skills groups={SKILLS} />
        <Projects projects={content.projects} />
        <LabSection experiments={content.lab} />
        <GallerySection />
        <Contact email={content.profile.email} />
      </main>
      <Footer socials={content.socials} />
    </div>
  );
}
