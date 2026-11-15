"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { FuelType, Investigation, SafetyCategory } from "@/data/investigations";
import { CAT_META, CatChip, FUEL_META, Section } from "./ui";

export default function Explorer({
  investigations,
  onOpen,
  compareIds,
  toggleCompare,
}: {
  investigations: Investigation[];
  onOpen: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [fuel, setFuel] = useState<FuelType | "all">("all");
  const [cat, setCat] = useState<SafetyCategory | "all">("all");
  const [hw, setHw] = useState<string>("all");
  const hardware = useMemo(() => Array.from(new Set(investigations.map((i) => i.hardware))), [investigations]);

  const list = investigations.filter((i) => {
    const hay = `${i.acronym} ${i.name} ${i.fuels.join(" ")} ${i.sensors.join(" ")} ${i.objective} ${i.findings.join(" ")}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (fuel === "all" || i.fuelType === fuel) && (cat === "all" || i.categories.includes(cat)) && (hw === "all" || i.hardware === hw);
  });

  // Triad counts
  const triad = (["prevention", "detection", "suppression"] as const).map((c) => ({ c, n: investigations.filter((i) => i.categories.includes(c)).length }));

  return (
    <Section
      id="explore"
      eyebrow="03 · Investigation Explorer"
      title={
        <>
          Twenty experiments. <span className="italic text-ink-2">One searchable library.</span>
        </>
      }
      intro="Filter by the fire safety pillar, fuel, or the ISS hardware that ran the test. Search fuels, sensors or findings, such as 'PMMA', 'radiometer' or 'cool flame'."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {triad.map(({ c, n }) => (
          <button
            key={c}
            onClick={() => setCat(cat === c ? "all" : c)}
            className={`glass group flex items-center justify-between rounded-2xl p-5 text-left transition ${cat === c ? "ring-1 ring-blue" : "hover:border-line-2"}`}
          >
            <div>
              <div className={`text-xs font-medium uppercase tracking-wider ${CAT_META[c].color}`}>
                {CAT_META[c].icon} {CAT_META[c].label}
              </div>
              <div className="mt-1 text-xs text-ink-3">
                {c === "prevention" ? "Material flammability & ignition limits" : c === "detection" ? "Smoke & particle signatures" : "Extinguishing agents & limits"}
              </div>
            </div>
            <div className="font-mono text-3xl text-ink">{n}</div>
          </button>
        ))}
      </div>

      <div className="glass hud mb-5 flex flex-col gap-3 rounded-2xl p-3 md:flex-row md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fuels, sensors, findings…"
          className="w-full rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-blue focus:outline-none md:max-w-xs"
          aria-label="Search investigations"
        />
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
          {(["all", ...Object.keys(FUEL_META)] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFuel(f as FuelType | "all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${fuel === f ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:text-ink"}`}
            >
              {f === "all" ? "All fuels" : FUEL_META[f as FuelType].label}
            </button>
          ))}
        </div>
        <select
          value={hw}
          onChange={(e) => setHw(e.target.value)}
          className="rounded-xl border border-line bg-bg/60 px-3 py-2 text-xs text-ink-2 focus:border-blue focus:outline-none md:ml-auto"
          aria-label="Filter by hardware"
        >
          <option value="all">All hardware</option>
          {hardware.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((i) => (
            <motion.article
              key={i.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="glass hud group relative flex flex-col overflow-hidden rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-line-2"
            >
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${FUEL_META[i.fuelType].color}, transparent)` }} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">
                    {i.project} · {i.years}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-ink">{i.acronym}</h3>
                  <div className="text-xs text-ink-2">{i.name}</div>
                </div>
                <Relevance v={i.directness} />
              </div>
              <p className="mt-3 line-clamp-3 text-[0.82rem] leading-relaxed text-ink-3">{i.objective}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-bg/40 p-2.5 font-mono text-[0.68rem]">
                <div>
                  <dt className="text-ink-3">O₂</dt>
                  <dd className="text-ink">
                    {i.o2[0]}
                    {i.o2[1] !== i.o2[0] && `–${i.o2[1]}`}%
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">kPa</dt>
                  <dd className="text-ink">
                    {i.pressure[0]}
                    {i.pressure[1] !== i.pressure[0] && `–${i.pressure[1]}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Hardware</dt>
                  <dd className="truncate text-ink">{i.hardware.split(" ")[0]}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {i.categories.map((c) => (
                  <CatChip key={c} c={c} />
                ))}
              </div>
              <div className="mt-auto flex gap-2 pt-5">
                <button onClick={() => onOpen(i.id)} className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-ink transition hover:bg-blue hover:text-bg">
                  Open insights →
                </button>
                <button
                  onClick={() => toggleCompare(i.id)}
                  className={`rounded-xl border px-3 py-2 text-xs transition ${compareIds.includes(i.id) ? "border-blue bg-blue/15 text-blue" : "border-line text-ink-2 hover:text-ink"}`}
                  aria-pressed={compareIds.includes(i.id)}
                >
                  {compareIds.includes(i.id) ? "✓" : "+"} Compare
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-ink-3">No investigations match. Try clearing a filter.</p>}
    </Section>
  );
}

function Relevance({ v }: { v: number }) {
  const R = 16,
    C = 2 * Math.PI * R;
  return (
    <div className="relative h-11 w-11 shrink-0" title="Directness to crew fire safety">
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
        <circle cx="20" cy="20" r={R} stroke="#ffa94d" strokeWidth="4" fill="none" strokeDasharray={C} strokeDashoffset={C * (1 - v)} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.65rem] text-ink">{Math.round(v * 100)}</span>
    </div>
  );
}
