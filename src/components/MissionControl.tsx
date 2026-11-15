"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Check, Info, Map as MapIcon, MessagesSquare, Plus, Rocket, Scale, Sparkles, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { Investigation, SafetyCategory } from "@/data/investigations";
import { flammabilityIndex, missions, type Mission } from "@/lib/missions";
import { insights, rank, WEIGHTS, type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import Ask from "./Ask";
import Compare from "./Compare";
import Envelope from "./Envelope";
import { Btn, CAT_META, FUEL_META, MISSION_ICON, Section, Slider } from "./ui";

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

const STEPS: { t: string; d: string; icon: LucideIcon }[] = [
  { t: "Destination", d: "Where will the crew live?", icon: Rocket },
  { t: "Data map", d: "Is that atmosphere tested?", icon: MapIcon },
  { t: "Evidence", d: "Which experiments matter?", icon: Scale },
  { t: "Compare & ask", d: "What should we do?", icon: MessagesSquare },
];

const PARTS = [
  ["o2", "Oxygen", "#1f5cff"],
  ["pressure", "Pressure", "#59c2ff"],
  ["flow", "Airflow", "#7c5cff"],
  ["fuel", "Fuel", "#12b886"],
  ["directness", "Directness", "#ff6a2b"],
] as const;

export default function MissionControl(p: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(Math.max(0, Math.min(3, n)));
  };

  return (
    <Section
      id="control"
      eyebrow="Mission control"
      title={
        <>
          Plan a crew&apos;s fire safety <span className="text-blue">in four steps.</span>
        </>
      }
      intro="Choose a destination, check whether its atmosphere has ever been tested, see which experiments matter most, then compare them and ask the AI analyst. Every step updates live."
    >
      <div className="panel p-2 sm:p-3">
        {/* Stepper */}
        <div className="rounded-[24px] bg-paper p-2">
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <button key={s.t} onClick={() => go(i)} className="relative flex items-center gap-3 rounded-[18px] p-2.5 text-left sm:p-3">
                  {active && <motion.span layoutId="step-bg" className="absolute inset-0 rounded-[18px] bg-white shadow-[0_8px_24px_-12px_rgba(16,24,40,0.25)] ring-1 ring-line" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[0.9rem] font-semibold transition-colors ${active ? "bg-blue text-white" : done ? "bg-go text-white" : "bg-white text-ink-3 ring-1 ring-line"}`}>
                    {done ? <Check size={16} /> : <s.icon size={16} />}
                  </span>
                  <span className="relative hidden min-w-0 md:block">
                    <span className="block text-[0.75rem] text-ink-3">Step {i + 1}</span>
                    <span className={`block truncate text-[0.92rem] font-semibold ${active ? "text-ink" : "text-ink-2"}`}>{s.t}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mx-3 mb-1 mt-2 h-1 overflow-hidden rounded-full bg-line">
            <motion.div className="h-full rounded-full bg-blue" animate={{ width: `${((step + 1) / 4) * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
          </div>
        </div>

        <div className="px-3 pb-3 pt-6 sm:px-6 sm:pt-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[0.85rem] font-medium text-blue">
                Step {step + 1} of 4
              </div>
              <h3 className="text-[1.8rem] font-semibold leading-tight sm:text-[2.2rem]">{STEPS[step].d}</h3>
            </div>
            <span className="hidden items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[0.82rem] font-medium text-ink-2 sm:inline-flex">
              {(() => {
                const I = MISSION_ICON[p.missionId] ?? MISSION_ICON.custom;
                return <I size={14} />;
              })()}
              {p.label}
            </span>
          </div>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && <StepDestination {...p} />}
                {step === 1 && (
                  <div>
                    <Hint>
                      Each box is the range of oxygen and pressure one experiment tested. The orange zone is where Moon, rover and Mars habitats will be. Your mission is the blue dot. Drag it to try another atmosphere, or click a box to open the experiment.
                    </Hint>
                    <Envelope investigations={p.investigations} cond={p.cond} onOpen={p.onOpen} setCond={p.setCond} />
                  </div>
                )}
                {step === 2 && <StepEvidence {...p} />}
                {step === 3 && <StepCompare {...p} />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <Btn variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft size={16} /> Back
            </Btn>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-blue" : "w-1.5 bg-line-2"}`} />
              ))}
            </div>
            {step < 3 ? (
              <Btn variant="ink" onClick={() => go(step + 1)}>
                {STEPS[step + 1].t} <ArrowRight size={16} />
              </Btn>
            ) : (
              <Btn variant="ghost" onClick={() => go(0)}>
                Start over
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-3 rounded-2xl bg-blue-soft px-4 py-3 text-[0.9rem] leading-relaxed text-ink">
      <Info size={17} className="mt-0.5 shrink-0 text-blue" />
      <span>{children}</span>
    </div>
  );
}

function StepDestination(p: Props) {
  const fi = flammabilityIndex(p.cond.o2, p.cond.pressure);
  const ranked = useMemo(() => rank(p.investigations, p.cond), [p.investigations, p.cond]);
  const covered = ranked.filter((r) => r.covers).length;
  const note = missions.find((m) => m.id === p.missionId)?.note ?? "A custom atmosphere. Adjust any of the four variables.";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {missions.map((m) => {
            const active = p.missionId === m.id;
            const Icon = MISSION_ICON[m.id];
            return (
              <motion.button
                key={m.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => p.setMission(m)}
                className={`relative overflow-hidden rounded-3xl p-4 text-left transition-colors ${active ? "bg-ink text-white" : "bg-paper text-ink hover:bg-[#eceef3]"}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-blue text-white" : "bg-white text-ink-2"}`}>
                  <Icon size={19} />
                </span>
                <span className="mt-4 block text-[1rem] font-semibold">{m.short}</span>
                <span className={`tnum mt-0.5 block text-[0.78rem] ${active ? "text-snow-2" : "text-ink-3"}`}>
                  {m.o2}% O₂ · {m.pressure} kPa · {m.gravity} g
                </span>
                {active && <motion.span layoutId="dest-check" className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink"><Check size={13} /></motion.span>}
              </motion.button>
            );
          })}
        </div>
        <p className="mt-4 text-[0.92rem] leading-relaxed text-ink-2">{note}</p>
        <div className="mt-5 grid gap-x-8 gap-y-6 rounded-3xl bg-paper p-5 sm:grid-cols-2">
          <Slider label="Oxygen" unit="%" value={p.cond.o2} min={10} max={100} step={1} onChange={(v) => p.setCond({ ...p.cond, o2: v })} hint="Earth air is 21%" />
          <Slider label="Pressure" unit=" kPa" value={p.cond.pressure} min={20} max={300} step={0.1} onChange={(v) => p.setCond({ ...p.cond, pressure: v })} hint={`${(p.cond.pressure / 6.895).toFixed(1)} psi`} />
          <Slider label="Airflow" unit=" cm/s" value={p.cond.flow} min={0} max={50} step={1} onChange={(v) => p.setCond({ ...p.cond, flow: v })} hint="From ventilation fans" />
          <Slider label="Gravity" unit=" g" value={p.cond.gravity} min={0} max={1} step={0.01} onChange={(v) => p.setCond({ ...p.cond, gravity: v })} hint="Moon 0.17 · Mars 0.38" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-3xl bg-night p-5 text-snow">
          <div className="text-[0.82rem] text-snow-3">How flammable is this cabin?</div>
          <Meter value={fi} max={3} label={`${fi.toFixed(2)}×`} sub="compared with ISS air" tone={fi > 1.4 ? "flame" : fi > 1.05 ? "warn" : "go"} />
        </div>
        <div className="rounded-3xl bg-paper p-5">
          <div className="text-[0.82rem] text-ink-3">Experiments tested near these conditions</div>
          <div className="display tnum mt-1 text-[2.6rem] font-semibold leading-none">
            {covered}
            <span className="text-xl text-ink-3"> / {p.investigations.length}</span>
          </div>
          <div className="mt-3 flex gap-1">
            {ranked.map((r) => (
              <span key={r.inv.id} title={r.inv.acronym} className="h-6 flex-1 rounded-[4px]" style={{ background: r.covers ? FUEL_META[r.inv.fuelType].color : "var(--line)" }} />
            ))}
          </div>
          <div className="mt-2 text-[0.78rem] text-ink-3">Each block is one experiment, colored when it covers your atmosphere.</div>
        </div>
      </div>
    </div>
  );
}

function Meter({ value, max, label, sub, tone }: { value: number; max: number; label: string; sub: string; tone: "go" | "warn" | "flame" }) {
  const R = 64,
    C = Math.PI * R;
  const col = tone === "go" ? "#12b886" : tone === "warn" ? "#ffb347" : "#ff6a2b";
  return (
    <div className="relative mx-auto mt-2 w-full max-w-[240px]">
      <svg viewBox="0 0 160 90" className="w-full">
        <path d="M16 82 A64 64 0 0 1 144 82" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round" />
        <motion.path d="M16 82 A64 64 0 0 1 144 82" fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - Math.min(1, value / max)) }} transition={{ type: "spring", stiffness: 110, damping: 20 }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="display tnum text-[2.2rem] font-semibold leading-none">{label}</div>
        <div className="mt-1 text-[0.78rem] text-snow-3">{sub}</div>
      </div>
    </div>
  );
}

function StepEvidence(p: Props) {
  const ranked = useMemo(() => rank(p.investigations, p.cond, p.focus), [p.investigations, p.cond, p.focus]);
  const ins = useMemo(() => insights(p.investigations, p.cond), [p.investigations, p.cond]);
  const ai = useAI();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <Hint>
          Experiments are ranked by how well they match your mission (0 to 100). The colored bar shows where each score comes from. Select up to three to compare in the next step.
        </Hint>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["all", "prevention", "detection", "suppression"] as const).map((f) => {
            const on = p.focus === f;
            const meta = f === "all" ? null : CAT_META[f];
            return (
              <button key={f} onClick={() => p.setFocus(f)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.85rem] font-medium transition ${on ? "bg-ink text-white" : "bg-paper text-ink-2 hover:text-ink"}`}>
                {meta && <meta.icon size={14} />}
                {f === "all" ? "All pillars" : meta!.label}
              </button>
            );
          })}
        </div>
        <ol data-lenis-prevent className="scrollbar-thin max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
          {ranked.map((r, idx) => {
            const picked = p.compareIds.includes(r.inv.id);
            return (
              <motion.li key={r.inv.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }} className={`group flex items-center gap-3 rounded-2xl p-3 transition-colors sm:gap-4 sm:px-4 ${picked ? "bg-blue-soft" : "bg-paper hover:bg-[#eceef3]"}`}>
                <span className="display tnum w-6 text-right text-[0.95rem] font-semibold text-ink-3">{idx + 1}</span>
                <button onClick={() => p.onOpen(r.inv.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-ink group-hover:text-blue">{r.inv.acronym}</span>
                    <span className="hidden truncate text-[0.82rem] text-ink-3 sm:inline">{r.inv.name}</span>
                    {r.covers && <span className="rounded-full bg-go-soft px-2 py-px text-[0.7rem] font-semibold text-go">Tested here</span>}
                  </span>
                  <span className="mt-2 flex h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white">
                    {PARTS.map(([k, , col]) => (
                      <motion.span key={k} animate={{ width: `${r.parts[k] * WEIGHTS[k] * 100}%` }} style={{ background: col }} className="h-full" />
                    ))}
                  </span>
                </button>
                <span className="display tnum w-9 text-right text-[1.3rem] font-semibold">{r.score}</span>
                <button
                  onClick={() => p.toggleCompare(r.inv.id)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${picked ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink"}`}
                  aria-label={picked ? `Remove ${r.inv.acronym} from comparison` : `Add ${r.inv.acronym} to comparison`}
                  aria-pressed={picked}
                >
                  {picked ? <Check size={15} /> : <Plus size={15} />}
                </button>
              </motion.li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-ink-3">
          {PARTS.map(([k, l, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full" style={{ background: c }} />
              {l} {Math.round(WEIGHTS[k] * 100)}%
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[0.85rem] font-semibold text-ink-2">What the data says</div>
        <AnimatePresence mode="popLayout">
          {ins.map((i) => (
            <motion.div
              key={i.text}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 rounded-2xl p-4 text-[0.86rem] leading-relaxed ${i.tone === "warn" ? "bg-flame-soft text-[#7a2e0c]" : i.tone === "ok" ? "bg-go-soft text-[#0b5e45]" : "bg-paper text-ink-2"}`}
            >
              {i.tone === "warn" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" /> : i.tone === "ok" ? <Check size={16} className="mt-0.5 shrink-0 text-go" /> : <Info size={16} className="mt-0.5 shrink-0 text-blue" />}
              <span>{i.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="mt-2 rounded-3xl bg-night p-5 text-snow">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles size={16} className="text-sky" /> Crew fire safety briefing
          </div>
          <p className="mt-1 text-[0.84rem] text-snow-2">Gemini reads all 20 experiments and this ranking, then writes a cited briefing for {p.label}.</p>
          <Btn variant="white" className="mt-4 w-full" disabled={ai.loading} onClick={() => ai.run({ mode: "briefing", conditions: { ...p.cond, label: p.label } })}>
            {ai.loading ? "Writing briefing…" : ai.text ? "Write it again" : "Write the briefing"}
          </Btn>
        </div>
        {ai.text && (
          <div data-lenis-prevent className="scrollbar-thin max-h-[420px] overflow-y-auto rounded-3xl bg-paper p-5">
            <AIText text={ai.text} loading={ai.loading} investigations={p.investigations} onCite={p.onOpen} />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {p.compareIds.map((id) => {
            const inv = p.investigations.find((i) => i.id === id);
            return inv ? (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-soft px-2.5 py-1 text-[0.78rem] font-semibold text-blue">
                {inv.acronym}
              </span>
            ) : null;
          })}
          <span className="py-1 text-[0.78rem] text-ink-3">{p.compareIds.length}/3 selected for step 4</span>
        </div>
      </div>
    </div>
  );
}

function StepCompare(p: Props) {
  const [mode, setMode] = useState<"compare" | "ask">("compare");
  return (
    <div>
      <div className="mb-5 inline-flex rounded-full bg-paper p-1">
        {(
          [
            ["compare", "Compare side by side", Scale],
            ["ask", "Ask the analyst", MessagesSquare],
          ] as const
        ).map(([id, l, I]) => (
          <button key={id} onClick={() => setMode(id)} className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.88rem] font-semibold">
            {mode === id && <motion.span layoutId="cmp-mode" className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-line" />}
            <I size={15} className="relative" />
            <span className={`relative ${mode === id ? "text-ink" : "text-ink-3"}`}>{l}</span>
          </button>
        ))}
      </div>
      {mode === "compare" ? (
        <Compare investigations={p.investigations} ids={p.compareIds} toggle={p.toggleCompare} cond={p.cond} label={p.label} onOpen={p.onOpen} />
      ) : (
        <Ask investigations={p.investigations} cond={p.cond} label={p.label} onOpen={p.onOpen} />
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {p.compareIds.map((id) => {
          const inv = p.investigations.find((i) => i.id === id);
          return inv ? (
            <button key={id} onClick={() => p.onOpen(id)} className="inline-flex items-center gap-1 text-[0.82rem] font-medium text-blue hover:underline">
              Open {inv.acronym} <ArrowUpRight size={13} />
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}
