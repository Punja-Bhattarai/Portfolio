"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#lab", label: "Lab" },
  { href: "#gallery", label: "Gallery" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track active section
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => !!el
    );
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "glass shadow-2xl shadow-black/40" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/#home"
            className="font-display text-base font-bold tracking-wide text-cream transition-colors hover:text-gold2"
          >
            Punja&nbsp;<span className="gold-text">Bhattarai</span>
          </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`nav-link font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  active === l.href.slice(1) ? "active text-gold2" : "text-mute hover:text-cream"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            aria-label="Admin"
            title="Admin"
            className="glass hidden rounded-full p-2.5 text-mute transition-all duration-300 hover:border-gold/50 hover:text-gold2 sm:block"
          >
            <Icon name="settings" className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/private-gallery"
            className="glass hidden items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold2 transition-all duration-300 hover:border-gold/50 hover:bg-gold/10 sm:inline-flex"
          >
            <Icon name="lock" className="h-3.5 w-3.5" />
            Private Gallery
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            className="glass rounded-full p-2.5 text-cream lg:hidden"
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="glass overflow-hidden lg:hidden"
          >
            <ul className="space-y-1 px-6 pb-6 pt-2">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={reduce ? false : { x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-4 py-3 font-display text-lg ${
                      active === l.href.slice(1) ? "text-gold2" : "text-mute"
                    }`}
                  >
                    {l.label}
                  </a>
                </motion.li>
              ))}
              <li>
                <Link
                  href="/private-gallery"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 font-mono text-sm uppercase tracking-widest text-gold2"
                >
                  <Icon name="lock" className="h-4 w-4" /> Private Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm uppercase tracking-widest text-mute"
                >
                  <Icon name="settings" className="h-4 w-4" /> Admin
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
