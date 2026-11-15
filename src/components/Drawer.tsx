"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { Investigation } from "@/data/investigations";
import { scoreInvestigation, type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { CatChip, FUEL_META } from "./ui";

export default function Drawer({
  inv,
  onClose,
  cond,
  label,
  investigations,
  onOpen,
}: {
  inv: Investigation | undefined;
  onClose: () => void;
  cond: Conditions;
  label: string;
  investigations: Investigation[];
  onOpen: (id: string) => void;
}) {
  const ai = useAI();
  const { setText } = ai;
  useEffect(() => {
    setText("");
  }, [inv?.id, setText]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const s = inv ? scoreInvestigation(inv, cond) : null;
  const psi = inv ? `https://psi.nasa.gov/physci/repo/search?q=${encodeURIComponent(inv.psiQuery)}&data_source=psi&data_type=investigation` : "#";

  return (
    <AnimatePresence>
      {inv && s && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={inv.name}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-line-2 bg-[#070b15] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-[#070b15]/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-ink-3">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FUEL_META[inv.fuelType].color }} />
                {inv.project} · {inv.hardware}
              </div>
              <button onClick={onClose} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:text-ink" aria-label="Close">
                Esc ✕
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-display text-4xl text-ink">{inv.acronym}</h3>
              <p className="mt-1 text-ink-2">{inv.name}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {inv.categories.map((c) => (
                  <CatChip key={c} c={c} />
                ))}
                <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] ${inv.dataConfidence === "sourced" ? "border-green/30 text-green" : "border-line-2 text-ink-3"}`}>
                  {inv.dataConfidence === "sourced" ? "Values sourced" : "Values approximate"}
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-blue/25 bg-blue/[0.06] p-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs uppercase tracking-wider text-blue">Relevance to {label}</div>
                  <div className="font-mono text-2xl text-ink">{s.score}</div>
                </div>
                <p className="mt-1 text-sm text-ink-2">{inv.habitatNote}</p>
              </div>

              <h4 className="mt-6 text-xs font-medium uppercase tracking-wider text-ink-3">Objective</h4>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{inv.objective}</p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ["O₂", `${inv.o2[0]}–${inv.o2[1]}`, "%"],
                  ["Pressure", `${inv.pressure[0]}–${inv.pressure[1]}`, "kPa"],
                  ["Airflow", `${inv.flow[0]}–${inv.flow[1]}`, "cm/s"],
                ].map(([k, v, u]) => (
                  <div key={k} className="rounded-xl border border-line bg-white/[0.02] p-3">
                    <div className="text-[0.65rem] uppercase tracking-wider text-ink-3">{k}</div>
                    <div className="mt-1 font-mono text-sm text-ink">
                      {v} <span className="text-ink-3">{u}</span>
                    </div>
                  </div>
                ))}
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ["Platform", inv.platform],
                  ["Fuels", inv.fuels.join(", ")],
                  ["Sample / burner", inv.sampleGeometry],
                  ["Diluents", inv.diluents.join(", ") || "None"],
                  ["Sensors & measurements", inv.sensors.join(" · ")],
                  ["What varied between tests", inv.variables],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 border-b border-line pb-3">
                    <dt className="text-xs text-ink-3">{k}</dt>
                    <dd className="text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>

              <h4 className="mt-6 text-xs font-medium uppercase tracking-wider text-ink-3">Key findings</h4>
              <ul className="mt-2 space-y-2">
                {inv.findings.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-relaxed text-ink-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    {f}
                  </li>
                ))}
              </ul>
              {inv.earthApplication && (
                <div className="mt-5 rounded-2xl border border-green/20 bg-green/[0.05] p-4 text-sm text-ink-2">
                  <span className="mr-1">🌍</span>
                  <strong className="text-green">On Earth:</strong> {inv.earthApplication}
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-line-2">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-white/[0.02] p-4">
                  <div className="text-sm font-semibold">✦ Interpret for {label}</div>
                  <button
                    onClick={() => ai.run({ mode: "interpret", ids: [inv.id], conditions: { ...cond, label } })}
                    disabled={ai.loading}
                    className="rounded-full bg-blue px-4 py-1.5 text-xs font-semibold text-bg transition hover:bg-white disabled:opacity-60"
                  >
                    {ai.loading ? "Thinking…" : ai.text ? "Again" : "Generate"}
                  </button>
                </div>
                <div className="p-4">
                  {ai.text ? (
                    <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} />
                  ) : (
                    <p className="text-xs text-ink-3">What this experiment means for your crew, how far it extrapolates, and one design implication.</p>
                  )}
                </div>
              </div>

              <a href={psi} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-blue hover:underline">
                Find the dataset in NASA PSI ↗
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
