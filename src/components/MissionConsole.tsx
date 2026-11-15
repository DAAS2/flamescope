"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Investigation, SafetyCategory } from "@/data/investigations";
import { missions, flammabilityIndex, type Mission } from "@/lib/missions";
import { rank, insights, WEIGHTS, type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { CAT_META, CatChip, FUEL_META, Section, Slider } from "./ui";

interface Props {
  investigations: Investigation[];
  missionId: string;
  setMission: (m: Mission) => void;
  cond: Conditions;
  setCond: (c: Conditions) => void;
  focus: SafetyCategory | "all";
  setFocus: (f: SafetyCategory | "all") => void;
  onOpen: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  label: string;
}

export default function MissionConsole(p: Props) {
  const ranked = useMemo(() => rank(p.investigations, p.cond, p.focus), [p.investigations, p.cond, p.focus]);
  const ins = useMemo(() => insights(p.investigations, p.cond), [p.investigations, p.cond]);
  const fi = flammabilityIndex(p.cond.o2, p.cond.pressure);
  const coverage = ranked.filter((r) => r.covers).length / p.investigations.length;
  const ai = useAI();

  return (
    <Section
      id="console"
      eyebrow="01 · Mission Console"
      title={
        <>
          Choose a habitat. <span className="italic text-ink-2">Watch the evidence re-rank.</span>
        </>
      }
      intro="Every investigation is scored against your mission's oxygen, pressure, airflow and gravity, so the research that matters most for that crew rises to the top."
    >
      {/* Mission presets */}
      <div className="scrollbar-thin -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {missions.map((m) => (
          <button
            key={m.id}
            onClick={() => p.setMission(m)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              p.missionId === m.id ? "border-blue bg-blue/15 text-ink shadow-[0_0_24px_-6px_rgba(92,200,255,0.6)]" : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
            }`}
          >
            <span aria-hidden>{m.emoji}</span> {m.short}
          </button>
        ))}
        <span className={`flex shrink-0 items-center rounded-full border px-4 py-2 text-sm ${p.missionId === "custom" ? "border-amber/50 bg-amber/10 text-amber" : "border-transparent text-ink-3"}`}>
          ⚙︎ Custom
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* Left: controls + gauges */}
        <div className="space-y-5">
          <div className="glass hud rounded-xl p-6">
            <div className="mb-1 text-sm font-semibold text-ink">{p.label}</div>
            <p className="mb-6 text-xs leading-relaxed text-ink-3">{missions.find((m) => m.id === p.missionId)?.note ?? "Custom atmosphere. Adjust any variable."}</p>
            <div className="space-y-5">
              <Slider label="Oxygen" unit="%" value={p.cond.o2} min={10} max={100} step={1} onChange={(v) => p.setCond({ ...p.cond, o2: v })} hint="Earth air = 21%" />
              <Slider label="Pressure" unit=" kPa" value={p.cond.pressure} min={20} max={300} step={0.1} onChange={(v) => p.setCond({ ...p.cond, pressure: v })} hint={`${(p.cond.pressure / 6.895).toFixed(1)} psi`} />
              <Slider label="Airflow" unit=" cm/s" value={p.cond.flow} min={0} max={50} step={1} onChange={(v) => p.setCond({ ...p.cond, flow: v })} hint="Ventilation fans; 0 = quiescent" />
              <Slider label="Gravity" unit=" g" value={p.cond.gravity} min={0} max={1} step={0.01} onChange={(v) => p.setCond({ ...p.cond, gravity: v })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Gauge label="Flammability vs ISS" value={fi} max={4} fmt={(v) => `${v.toFixed(2)}×`} tone={fi > 1.4 ? "ember" : fi > 1.05 ? "amber" : "green"} />
            <Gauge label="Data coverage" value={coverage} max={1} fmt={(v) => `${Math.round(v * 100)}%`} tone={coverage < 0.15 ? "ember" : coverage < 0.35 ? "amber" : "green"} />
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {ins.map((i) => (
                <motion.div
                  key={i.text}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl border p-3 text-[0.8rem] leading-relaxed ${
                    i.tone === "warn" ? "border-ember/30 bg-ember/[0.07] text-[#ffc7b8]" : i.tone === "ok" ? "border-green/25 bg-green/[0.06] text-[#c4f8e2]" : "border-line bg-white/[0.02] text-ink-2"
                  }`}
                >
                  {i.tone === "warn" ? "⚠ " : i.tone === "ok" ? "✓ " : "ℹ "}
                  {i.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: ranking */}
        <div className="glass hud flex min-w-0 flex-col rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <div className="text-sm font-semibold">Relevance ranking</div>
              <div className="text-xs text-ink-3">Score = O₂ fit · pressure fit · airflow fit · fuel relevance · fire safety directness</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "prevention", "detection", "suppression"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => p.setFocus(f)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${p.focus === f ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:text-ink"}`}
                >
                  {f === "all" ? "All" : `${CAT_META[f].icon} ${CAT_META[f].label}`}
                </button>
              ))}
            </div>
          </div>
          <ol className="scrollbar-thin max-h-[640px] divide-y divide-line overflow-y-auto">
            {ranked.map((r, idx) => (
              <motion.li key={r.inv.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }} className="group relative">
                <div className="flex items-start gap-3 p-4 sm:gap-4 sm:px-5">
                  <div className="w-6 pt-0.5 text-right font-mono text-xs text-ink-3">{idx + 1}</div>
                  <button onClick={() => p.onOpen(r.inv.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink transition group-hover:text-blue">{r.inv.acronym}</span>
                      <span className="truncate text-xs text-ink-3">{r.inv.name}</span>
                      {r.covers && <span className="rounded-full bg-green/15 px-2 py-px text-[0.65rem] font-medium text-green">tested here</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[0.7rem] text-ink-3">
                        <span className="h-2 w-2 rounded-full" style={{ background: FUEL_META[r.inv.fuelType].color }} />
                        {FUEL_META[r.inv.fuelType].label}
                      </span>
                      {r.inv.categories.map((c) => (
                        <CatChip key={c} c={c} />
                      ))}
                    </div>
                    {/* score breakdown bar */}
                    <div className="mt-2.5 flex h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/5" title="O₂ · pressure · flow · fuel · directness">
                      {(
                        [
                          ["o2", "#5cc8ff"],
                          ["pressure", "#2f6bff"],
                          ["flow", "#a78bfa"],
                          ["fuel", "#5ff0b4"],
                          ["directness", "#ffa94d"],
                        ] as const
                      ).map(([k, col]) => (
                        <motion.div key={k} animate={{ width: `${r.parts[k] * WEIGHTS[k] * 100}%` }} style={{ background: col }} className="h-full" />
                      ))}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-mono text-xl tabular-nums text-ink">{r.score}</div>
                    <button
                      onClick={() => p.toggleCompare(r.inv.id)}
                      className={`rounded-md border px-2 py-0.5 text-[0.65rem] transition ${p.compareIds.includes(r.inv.id) ? "border-blue bg-blue/15 text-blue" : "border-line text-ink-3 hover:text-ink"}`}
                    >
                      {p.compareIds.includes(r.inv.id) ? "✓ Compare" : "+ Compare"}
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-5 py-3 text-[0.68rem] text-ink-3">
            {[
              ["O₂ 30%", "#5cc8ff"],
              ["Pressure 15%", "#2f6bff"],
              ["Airflow 10%", "#a78bfa"],
              ["Fuel 15%", "#5ff0b4"],
              ["Directness 30%", "#ffa94d"],
            ].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI briefing */}
      <div className="glass hud mt-5 overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-blue/10 to-transparent p-5">
          <div>
            <div className="text-sm font-semibold">✦ AI Mission Fire Safety Briefing</div>
            <div className="text-xs text-ink-3">Gemini reads the full PSI dataset and the ranking above, then briefs your crew. Every claim is cited.</div>
          </div>
          <button
            onClick={() => ai.run({ mode: "briefing", conditions: { ...p.cond, label: p.label } })}
            disabled={ai.loading}
            className="rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-bg transition hover:bg-white disabled:opacity-60"
          >
            {ai.loading ? "Analysing…" : ai.text ? "Regenerate briefing" : `Generate briefing for ${p.label}`}
          </button>
        </div>
        <div className="min-h-[96px] p-6">
          {ai.text ? (
            <AIText text={ai.text} loading={ai.loading} investigations={p.investigations} onCite={p.onOpen} />
          ) : (
            <p className="text-sm text-ink-3">
              {ai.loading ? "Reading 20 investigations…" : "Pick a habitat above and generate a briefing: headline risk, the most relevant experiments, Prevention / Detection / Suppression actions, and the biggest data gap."}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

function Gauge({ label, value, max, fmt, tone }: { label: string; value: number; max: number; fmt: (v: number) => string; tone: "green" | "amber" | "ember" }) {
  const pct = Math.min(1, value / max);
  const R = 42,
    C = Math.PI * R;
  const col = tone === "green" ? "#5ff0b4" : tone === "amber" ? "#ffa94d" : "#ff5f3a";
  return (
    <div className="glass hud rounded-xl p-4 text-center">
      <svg viewBox="0 0 100 58" className="mx-auto w-full max-w-[150px]">
        <path d="M8 52 A42 42 0 0 1 92 52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
        <motion.path
          d="M8 52 A42 42 0 0 1 92 52"
          fill="none"
          stroke={col}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{ filter: `drop-shadow(0 0 6px ${col})` }}
        />
      </svg>
      <div className="-mt-4 font-mono text-xl text-ink">{fmt(value)}</div>
      <div className="mt-1 text-[0.68rem] uppercase tracking-wider text-ink-3">{label}</div>
    </div>
  );
}
