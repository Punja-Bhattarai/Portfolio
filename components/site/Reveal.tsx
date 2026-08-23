"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  index,
  label,
  title,
}: {
  index: string;
  label: string;
  title: string;
}) {
  return (
    <Reveal>
      <div className="mb-12 md:mb-16">
        <p className="section-label mb-4 flex items-center gap-3">
          <span className="text-gold/60">{index}</span>
          <span className="h-px w-10 bg-gold/40" aria-hidden />
          {label}
        </p>
        <h2 className="section-title">{title}</h2>
      </div>
    </Reveal>
  );
}
