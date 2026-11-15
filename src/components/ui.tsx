"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SafetyCategory } from "@/data/investigations";

export function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 max-w-3xl"
      >
        <div className="mb-4 flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-blue"><span className="h-px w-8 bg-blue" />{eyebrow}</div>
        <h2 className="font-display text-4xl font-semibold uppercase leading-[1] tracking-tight text-ink sm:text-6xl">{title}</h2>
        {intro && <p className="mt-4 text-base leading-relaxed text-ink-2 sm:text-lg">{intro}</p>}
      </motion.div>
      {children}
    </section>
  );
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const CAT_META: Record<SafetyCategory, { label: string; color: string; bg: string; icon: string }> = {
  prevention: { label: "Prevention", color: "text-green", bg: "bg-green/10 border-green/30", icon: "🛡️" },
  detection: { label: "Detection", color: "text-violet", bg: "bg-violet/10 border-violet/30", icon: "📡" },
  suppression: { label: "Suppression", color: "text-amber", bg: "bg-amber/10 border-amber/30", icon: "🧯" },
  fundamentals: { label: "Fundamentals", color: "text-blue", bg: "bg-blue/10 border-blue/30", icon: "🔬" },
};

export function CatChip({ c }: { c: SafetyCategory }) {
  const m = CAT_META[c];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${m.bg} ${m.color}`}>{m.label}</span>;
}

export const FUEL_META = {
  solid: { label: "Solid", color: "#5ff0b4" },
  liquid: { label: "Liquid droplet", color: "#ffa94d" },
  gas: { label: "Gaseous", color: "#5cc8ff" },
  aerosol: { label: "Smoke / aerosol", color: "#a78bfa" },
} as const;

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-3">{label}</span>
        <span className="font-mono text-sm text-ink">
          {value}
          <span className="ml-0.5 text-ink-3">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="slider w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--p" as string]: `${p}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {hint && <div className="mt-1 text-[0.7rem] text-ink-3">{hint}</div>}
    </label>
  );
}
