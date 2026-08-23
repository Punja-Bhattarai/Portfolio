"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { PROFILE } from "@/data/content";
import { Icon } from "./Icon";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


export function Hero({ avatar }: { avatar?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0]);

  
  return (
    <section
      id="home"
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden"
      aria-label="Introduction"
    >
      <div className="glow left-[-10%] top-[10%] h-[480px] w-[480px]" aria-hidden />
      <div
        className="glow bottom-[5%] right-[-8%] h-[420px] w-[420px]"
        style={{ background: "radial-gradient(closest-side, rgba(94,116,201,0.12), transparent)" }}
        aria-hidden
      />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-24 pt-32 md:px-8 lg:grid-cols-[1.35fr_1fr] lg:pt-20">
        <motion.div style={reduce ? undefined : { y: textY, opacity: fade }}>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
            className="section-label mb-6"
          >
            Portfolio — BCS Student &amp; Developer
          </motion.p>

          <h1 className="display-hero select-none" aria-label={`${PROFILE.firstName} ${PROFILE.lastName}`}>
            {[PROFILE.firstName, PROFILE.lastName].map((word, wi) => (
              <span key={word} className="block overflow-hidden">
                <motion.span
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.35 + wi * 0.14, ease: EASE }}
                  className={`block ${wi === 1 ? "gold-text" : ""}`}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
            className="mt-6 font-mono text-xs uppercase tracking-widest2 text-mute sm:text-sm"
          >
            {PROFILE.roles.join(" • ")}
          </motion.p>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.88, ease: EASE }}
            className="mt-6 max-w-xl leading-relaxed text-mute"
          >
            {PROFILE.intro}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a href="#projects" className="btn-primary">
              View Projects
              <Icon name="chevronRight" className="h-4 w-4" />
            </a>
            <a href="#about" className="btn-ghost">
              About Me
            </a>
            <a
              href={PROFILE.cvFile}
              download
              className="btn-ghost"
              title="Download my CV (PDF)"
            >
              <Icon name="download" className="h-4 w-4" />
              Download CV
            </a>
          </motion.div>
        </motion.div>

        {/* Portrait */}
        <motion.div
          style={reduce ? undefined : { y: imgY }}
          className="relative mx-auto hidden w-full max-w-sm lg:block"
          aria-hidden
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.55, ease: EASE }}
            className="relative"
          >
            <div
              className="absolute -inset-4 rounded-[2rem] opacity-60 blur-2xl"
              style={{
                background:
                  "conic-gradient(from 120deg, rgba(201,161,94,0.35), transparent 40%, rgba(94,116,201,0.25) 70%, transparent)",
              }}
            />
            <div className="glass relative overflow-hidden rounded-[2rem] shadow-2xl shadow-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar || PROFILE.avatarImage}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-widest2 text-cream/80">
                {PROFILE.location} · Est. Portfolio v1
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#about"
        aria-label="Scroll to About section"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={reduce ? undefined : { opacity: fade }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-mute hover:text-gold2 md:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest2">Scroll</span>
        <motion.span
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <Icon name="chevronDown" className="h-4 w-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
