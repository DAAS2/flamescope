"use client";

import { motion } from "framer-motion";
import { CarFront, Flame, Globe2, House, Microscope, Moon, Orbit, Radar, Satellite, ShieldCheck, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SafetyCategory } from "@/data/investigations";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- Layout ---------- */

export function Section({
  id,
  title,
  intro,
  children,
  dark = false,
  className = "",
  aside,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-[1240px] scroll-mt-24 px-4 py-20 sm:px-6 md:py-28 ${className}`}>
      <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: EASE }} className="max-w-3xl">
          <h2 className={`text-[2.4rem] font-semibold leading-[1.02] sm:text-6xl ${dark ? "text-snow" : "text-ink"}`}>{title}</h2>
          {intro && <p className={`mt-5 max-w-2xl text-[1.05rem] leading-relaxed ${dark ? "text-snow-2" : "text-ink-2"}`}>{intro}</p>}
        </motion.div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Muted({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={dark ? "text-snow-3" : "text-ink-3"}>{children}</span>;
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

/* ---------- Controls ---------- */

export function Btn({
  children,
  onClick,
  variant = "ink",
  size = "md",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ink" | "blue" | "ghost" | "white" | "ghost-dark";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const v = {
    ink: "bg-ink text-white hover:bg-blue",
    blue: "bg-blue text-white hover:bg-ink",
    white: "bg-white text-ink hover:bg-blue hover:text-white",
    ghost: "bg-white text-ink ring-1 ring-line hover:ring-ink",
    "ghost-dark": "bg-white/5 text-snow ring-1 ring-white/15 hover:bg-white/12",
  }[variant];
  const s = size === "sm" ? "h-9 px-4 text-[0.82rem]" : "h-11 px-5 text-[0.92rem]";
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${v} ${s} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function IconTile({ icon: Icon, active, tone = "blue", dark = false }: { icon: LucideIcon; active?: boolean; tone?: "blue" | "flame" | "go" | "violet"; dark?: boolean }) {
  const on = { blue: "bg-blue text-white", flame: "bg-flame text-white", go: "bg-go text-white", violet: "bg-violet text-white" }[tone];
  const off = dark ? "bg-white/8 text-snow-2" : "bg-paper text-ink-2";
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? on : off}`}>
      <Icon size={17} strokeWidth={2} />
    </span>
  );
}

/** Vela-style segmented tabs with icon tiles and an animated underline. */
export function Seg<T extends string>({
  items,
  value,
  onChange,
  id,
  dark = false,
}: {
  items: { id: T; label: string; icon?: LucideIcon; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
  dark?: boolean;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 pr-5 text-left transition ${
              active ? (dark ? "bg-white/10" : "bg-white shadow-[0_8px_24px_-12px_rgba(16,24,40,0.25)] ring-1 ring-line") : dark ? "hover:bg-white/5" : "hover:bg-white/60"
            }`}
          >
            {it.icon && <IconTile icon={it.icon} active={active} dark={dark} />}
            <span>
              <span className={`block text-[0.92rem] font-semibold ${dark ? (active ? "text-snow" : "text-snow-2") : active ? "text-ink" : "text-ink-2"}`}>{it.label}</span>
              {it.hint && <span className={`block text-[0.75rem] ${dark ? "text-snow-3" : "text-ink-3"}`}>{it.hint}</span>}
            </span>
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-x-4 -bottom-px h-[2px] rounded-full bg-blue" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
  dark = false,
  band,
  bandLabel = "Tested by NASA",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
  dark?: boolean;
  band?: [number, number];
  bandLabel?: string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const out = band && (value < band[0] - 1e-6 || value > band[1] + 1e-6);
  return (
    <label className="block">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className={`text-[0.85rem] font-medium ${dark ? "text-snow-2" : "text-ink-2"}`}>{label}</span>
        <span className={`tnum text-[0.95rem] font-semibold ${out ? "text-warn" : dark ? "text-snow" : "text-ink"}`}>
          {value}
          <span className={`ml-0.5 text-[0.8rem] font-normal ${dark ? "text-snow-3" : "text-ink-3"}`}>{unit}</span>
        </span>
      </div>
      <div className="relative">
        {band && (
          <div
            className="pointer-events-none absolute -top-[5px] h-4 rounded-full bg-go/20 ring-1 ring-go/40"
            style={{ left: `${pct(band[0])}%`, width: `max(8px, ${pct(band[1]) - pct(band[0])}%)` }}
            title={bandLabel}
          />
        )}
        <input
          type="range"
          className={`slider relative w-full ${dark ? "on-dark" : ""}`}
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ ["--p" as string]: `${pct(value)}%` }}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
      {(hint || band) && (
        <div className={`mt-2 flex justify-between text-[0.72rem] ${dark ? "text-snow-3" : "text-ink-3"}`}>
          <span>{hint}</span>
          {band && <span className={out ? "font-medium text-warn" : "text-go"}>{out ? "Beyond tested range" : bandLabel}</span>}
        </div>
      )}
    </label>
  );
}

/** A horizontal range meter: shows a tested range against an axis with a marker. */
export function RangeMeter({ range, value, min, max, unit, dark = false }: { range: [number, number]; value?: number; min: number; max: number; unit: string; dark?: boolean }) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const inside = value !== undefined && value >= range[0] && value <= range[1];
  return (
    <div>
      <div className={`relative h-2 rounded-full ${dark ? "bg-white/10" : "bg-paper"}`}>
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="absolute inset-y-0 origin-left rounded-full bg-blue"
          style={{ left: `${pct(range[0])}%`, width: `max(6px, ${pct(range[1]) - pct(range[0])}%)` }}
        />
        {value !== undefined && (
          <motion.div animate={{ left: `${pct(value)}%` }} className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ background: inside ? "var(--go)" : "var(--flame)" }} />
        )}
      </div>
      <div className={`tnum mt-1.5 flex justify-between text-[0.72rem] ${dark ? "text-snow-3" : "text-ink-3"}`}>
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ---------- Taxonomy ---------- */

export const CAT_META: Record<SafetyCategory, { label: string; color: string; soft: string; icon: LucideIcon }> = {
  prevention: { label: "Prevention", color: "#12b886", soft: "#e3f8f1", icon: ShieldCheck },
  detection: { label: "Detection", color: "#7c5cff", soft: "#efebff", icon: Radar },
  suppression: { label: "Suppression", color: "#e8590c", soft: "#fff0e8", icon: Flame },
  fundamentals: { label: "Fundamentals", color: "#1f5cff", soft: "#e7edff", icon: Microscope },
};

export function CatChip({ c, dark = false }: { c: SafetyCategory; dark?: boolean }) {
  const m = CAT_META[c];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium" style={{ background: dark ? `${m.color}22` : m.soft, color: m.color }}>
      <m.icon size={12} strokeWidth={2.4} />
      {m.label}
    </span>
  );
}

export const FUEL_META = {
  solid: { label: "Solid material", color: "#12b886" },
  liquid: { label: "Liquid droplet", color: "#ff8a3d" },
  gas: { label: "Gaseous fuel", color: "#3b82f6" },
  aerosol: { label: "Smoke & aerosol", color: "#8b5cf6" },
} as const;

export const MISSION_ICON: Record<string, LucideIcon> = {
  iss: Satellite,
  "moon-base": Moon,
  rover: CarFront,
  mars: Orbit,
  suit: UserRound,
  earth: Globe2,
  custom: SlidersHorizontal,
  habitat: House,
};
