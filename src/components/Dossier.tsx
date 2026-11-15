"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Globe2, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { scoreInvestigation, WEIGHTS, type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { KIND_LABEL, SimCanvas, simKind, testedSetup } from "./Simulator";
import { Btn, CatChip, FUEL_META, RangeMeter } from "./ui";

type Tab = "overview" | "conditions" | "findings" | "ai";
const TABS: { id: Tab; l: string }[] = [
  { id: "overview", l: "Overview" },
  { id: "conditions", l: "Conditions" },
  { id: "findings", l: "Findings" },
  { id: "ai", l: "Ask AI" },
];

type LenisLike = { stop: () => void; start: () => void };

export default function Dossier({
  inv,
  onClose,
  cond,
  label,
  investigations,
  onOpen,
  compareIds,
  toggleCompare,
}: {
  inv: Investigation | undefined;
  onClose: () => void;
  cond: Conditions;
  label: string;
  investigations: Investigation[];
  onOpen: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const ai = useAI();
  const { setText } = ai;

  useEffect(() => {
    setText("");
    setTab("overview");
  }, [inv?.id, setText]);

  useEffect(() => {
    if (!inv) return;
    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", k);
    };
  }, [inv, onClose]);

  return (
    <AnimatePresence>
      {inv && (
        <motion.div key="dossier" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div onClick={onClose} className="absolute inset-0 bg-night/55 backdrop-blur-md" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={inv.name}
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative flex h-[94svh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px] md:grid md:h-[min(760px,92svh)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
          >
            <Body key={inv.id} inv={inv} cond={cond} label={label} investigations={investigations} onOpen={onOpen} onClose={onClose} tab={tab} setTab={setTab} ai={ai} compareIds={compareIds} toggleCompare={toggleCompare} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({
  inv,
  cond,
  label,
  investigations,
  onOpen,
  onClose,
  tab,
  setTab,
  ai,
  compareIds,
  toggleCompare,
}: {
  inv: Investigation;
  cond: Conditions;
  label: string;
  investigations: Investigation[];
  onOpen: (id: string) => void;
  onClose: () => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  ai: ReturnType<typeof useAI>;
  compareIds: string[];
  toggleCompare: (id: string) => void;
}) {
  const s = scoreInvestigation(inv, cond);
  const kind = simKind(inv);
  const psi = `https://psi.nasa.gov/physci/repo/search?q=${encodeURIComponent(inv.psiQuery)}&data_source=psi&data_type=investigation`;
  const inCompare = compareIds.includes(inv.id);

  return (
    <>
      {/* Visual side */}
      <div className="relative flex h-[230px] shrink-0 flex-col bg-night text-snow md:h-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(31,92,255,0.22),transparent_70%)]" />
        <div className="absolute inset-0">
          <SimCanvas kind={kind} params={testedSetup(inv)} seed={0} />
        </div>
        <div className="relative flex items-start justify-between p-5 sm:p-6">
          <span className="frost inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.78rem] text-snow-2">
            <span className="h-2 w-2 rounded-full" style={{ background: FUEL_META[inv.fuelType].color }} />
            {KIND_LABEL[kind]}
          </span>
          <button onClick={onClose} className="frost flex h-9 w-9 items-center justify-center rounded-full md:hidden" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="relative mt-auto p-5 sm:p-6">
          <div className="text-[0.8rem] text-snow-3">Live replay at the tested conditions</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Oxygen", `${inv.o2[0]}–${inv.o2[1]}`, "%"],
              ["Pressure", `${inv.pressure[0]}–${inv.pressure[1]}`, "kPa"],
              ["Airflow", `${inv.flow[0]}–${inv.flow[1]}`, "cm/s"],
            ].map(([k, v, u]) => (
              <div key={k} className="frost rounded-2xl px-3 py-2.5">
                <div className="text-[0.72rem] text-snow-3">{k}</div>
                <div className="tnum text-[0.95rem] font-semibold">
                  {v} <span className="text-[0.75rem] font-normal text-snow-3">{u}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info side */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
          <div className="min-w-0">
            <div className="text-[0.82rem] text-ink-3">
              {inv.project} · {inv.years}
            </div>
            <h3 className="mt-1 text-[2.4rem] font-semibold leading-none">{inv.acronym}</h3>
            <p className="mt-2 text-[0.95rem] text-ink-2">{inv.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ScoreRing score={s.score} />
            <button onClick={onClose} className="hidden h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition hover:bg-ink hover:text-white md:flex" aria-label="Close">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-line px-6 sm:px-8">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-3 pb-3 pt-1 text-[0.9rem] font-semibold transition ${tab === t.id ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}>
              {t.l}
              {tab === t.id && <motion.span layoutId="dossier-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-blue" />}
            </button>
          ))}
        </div>

        <div data-lenis-prevent className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              {tab === "overview" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-1.5">
                    {inv.categories.map((c) => (
                      <CatChip key={c} c={c} />
                    ))}
                    <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${inv.dataConfidence === "sourced" ? "bg-go-soft text-go" : "bg-paper text-ink-3"}`}>
                      {inv.dataConfidence === "sourced" ? "Values sourced" : "Values approximate"}
                    </span>
                  </div>
                  <p className="text-[1rem] leading-relaxed text-ink-2">{inv.objective}</p>
                  <div className="rounded-3xl bg-blue-soft p-5">
                    <div className="text-[0.82rem] font-semibold text-blue">Why it matters for {label}</div>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink">{inv.habitatNote}</p>
                  </div>
                  <dl className="divide-y divide-line">
                    {[
                      ["Platform", inv.platform],
                      ["Hardware", inv.hardware],
                      ["Fuels", inv.fuels.join(", ")],
                      ["Sample", inv.sampleGeometry],
                      ["Sensors", inv.sensors.join(", ")],
                    ].map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3 text-[0.9rem]">
                        <dt className="text-ink-3">{k}</dt>
                        <dd className="text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {tab === "conditions" && (
                <div className="space-y-7">
                  <p className="text-[0.92rem] text-ink-2">
                    Blue bars show what {inv.acronym} tested. The dot is your mission ({label}). <span className="text-go">Green</span> means it falls inside the tested range, <span className="text-flame">orange</span> means it is outside.
                  </p>
                  {[
                    { k: "Oxygen", r: inv.o2, v: cond.o2, min: 10, max: 100, u: "%" },
                    { k: "Pressure", r: inv.pressure, v: cond.pressure, min: 20, max: 310, u: " kPa" },
                    { k: "Airflow", r: inv.flow, v: cond.flow, min: 0, max: 50, u: " cm/s" },
                  ].map((x) => (
                    <div key={x.k}>
                      <div className="mb-2 flex items-baseline justify-between text-[0.9rem]">
                        <span className="font-semibold">{x.k}</span>
                        <span className="tnum text-ink-3">
                          tested {x.r[0]}–{x.r[1]}
                          {x.u} · yours {x.v}
                          {x.u}
                        </span>
                      </div>
                      <RangeMeter range={x.r} value={x.v} min={x.min} max={x.max} unit={x.u.trim()} />
                    </div>
                  ))}
                  <div>
                    <div className="mb-2 text-[0.9rem] font-semibold">How the relevance score of {s.score} is built</div>
                    <div className="space-y-2">
                      {(
                        [
                          ["Oxygen fit", "o2"],
                          ["Pressure fit", "pressure"],
                          ["Airflow fit", "flow"],
                          ["Fuel relevance", "fuel"],
                          ["Fire safety directness", "directness"],
                        ] as const
                      ).map(([l, k]) => (
                        <div key={k} className="flex items-center gap-3 text-[0.85rem]">
                          <span className="w-40 text-ink-2">{l}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                            <motion.span initial={{ width: 0 }} animate={{ width: `${s.parts[k] * 100}%` }} transition={{ duration: 0.7 }} className="block h-full rounded-full bg-blue" />
                          </span>
                          <span className="tnum w-12 text-right text-ink-3">+{Math.round(s.parts[k] * WEIGHTS[k] * 100)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-paper p-5 text-[0.9rem]">
                    <div className="font-semibold">What varied between tests</div>
                    <p className="mt-1 text-ink-2">{inv.variables}</p>
                    {inv.diluents.length > 0 && <p className="mt-2 text-ink-3">Diluents: {inv.diluents.join(", ")}</p>}
                  </div>
                </div>
              )}

              {tab === "findings" && (
                <div className="space-y-4">
                  <ol className="space-y-3">
                    {inv.findings.map((f, i) => (
                      <motion.li key={f} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex gap-4 rounded-3xl bg-paper p-4">
                        <span className="display tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[0.9rem] font-semibold text-blue ring-1 ring-line">{i + 1}</span>
                        <span className="pt-1 text-[0.93rem] leading-relaxed text-ink">{f}</span>
                      </motion.li>
                    ))}
                  </ol>
                  {inv.earthApplication && (
                    <div className="flex gap-3 rounded-3xl bg-go-soft p-5 text-[0.92rem]">
                      <Globe2 size={18} className="mt-0.5 shrink-0 text-go" />
                      <span>
                        <b className="text-go">Back on Earth.</b> <span className="text-ink">{inv.earthApplication}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {tab === "ai" && (
                <div>
                  <p className="text-[0.92rem] text-ink-2">Gemini explains what {inv.acronym} means for {label}: how far the result can be stretched, and one design implication. Every claim is cited.</p>
                  <Btn variant="blue" className="mt-4" disabled={ai.loading} onClick={() => ai.run({ mode: "interpret", ids: [inv.id], conditions: { ...cond, label } })}>
                    <Sparkles size={15} /> {ai.loading ? "Thinking…" : ai.text ? "Generate again" : "Interpret for my mission"}
                  </Btn>
                  {ai.text && (
                    <div className="mt-5 rounded-3xl bg-paper p-5">
                      <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 sm:px-8">
          <Btn variant={inCompare ? "blue" : "ghost"} size="sm" onClick={() => toggleCompare(inv.id)}>
            {inCompare ? <Check size={14} /> : <Plus size={14} />} {inCompare ? "In comparison" : "Add to comparison"}
          </Btn>
          <a href={psi} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-blue hover:underline">
            Find it in NASA PSI <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const R = 22,
    C = 2 * Math.PI * R;
  return (
    <div className="relative h-14 w-14" title="Relevance to your mission (0–100)">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
        <motion.circle cx="28" cy="28" r={R} fill="none" stroke="var(--blue)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - score / 100) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <span className="display tnum absolute inset-0 flex items-center justify-center text-[1rem] font-semibold">{score}</span>
    </div>
  );
}
