"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { flammabilityIndex, missions, type Mission } from "@/lib/missions";
import { rank, type Conditions } from "@/lib/scoring";
import FlameViz from "./FlameViz";

const SpaceScene = dynamic(() => import("./three/SpaceScene"), { ssr: false, loading: () => null });

const DESTS = ["earth", "iss", "suit", "moon-base", "rover", "mars"];

export default function Hero({
  investigations,
  missionId,
  setMission,
  cond,
}: {
  investigations: Investigation[];
  missionId: string;
  setMission: (m: Mission) => void;
  cond: Conditions;
}) {
  const [shot, setShot] = useState("overview");
  useEffect(() => {
    if (missionId !== "custom" && shot !== "overview") setShot(missionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const pick = (id: string) => {
    const m = missions.find((x) => x.id === id);
    if (m) setMission(m);
    setShot(id);
  };

  const m = missions.find((x) => x.id === missionId);
  const fi = flammabilityIndex(cond.o2, cond.pressure);
  const top = useMemo(() => rank(investigations, cond).slice(0, 3), [investigations, cond]);
  const covered = useMemo(() => rank(investigations, cond).filter((r) => r.covers).length, [investigations, cond]);
  const regime = cond.gravity < 0.02 ? "Diffusion-limited sphere" : cond.gravity < 0.5 ? "Weak buoyant plume" : "Buoyant teardrop";
  const buoy = Math.sqrt(cond.gravity * 9.81 * 0.01) * 100; // cm/s, 1 cm flame

  return (
    <header id="top" className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <SpaceScene shot={shot} onPick={pick} />
      </div>
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />

      {/* Top-center readout (Eyes-style) */}
      <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 text-center">
        <AnimatePresence mode="wait">
          <motion.div key={shot} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <div className="label">{shot === "overview" ? "Select a destination" : "Destination locked"}</div>
            <div className="mt-1 font-display text-2xl font-semibold uppercase tracking-wide text-white sm:text-3xl">
              {shot === "overview" ? "Cislunar Space" : m?.name ?? "Custom atmosphere"}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 font-mono text-[11px] text-white/70">
              <span>O₂ {cond.o2}%</span>
              <span className="text-white/25">|</span>
              <span>{cond.pressure} kPa</span>
              <span className="text-white/25">|</span>
              <span>{cond.gravity} g</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Left headline */}
      <div className="pointer-events-none absolute bottom-40 left-4 max-w-xl sm:left-8 md:bottom-44 lg:left-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.9 }}>
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5a36]" /> NASA Space Apps 2026 · Flame in Freefall
          </div>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-7xl xl:text-[5.5rem]">
            Fire behaves
            <br />
            <span className="text-gradient">differently</span> here.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
            FlameScope turns NASA&apos;s microgravity combustion data into live, AI-interpreted fire safety intelligence for every crewed destination. Pick one.
          </p>
        </motion.div>
      </div>

      {/* Right telemetry panel */}
      <motion.aside
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.9, duration: 0.8 }}
        className="glass hud absolute right-4 top-36 hidden w-[300px] p-4 lg:right-12 lg:block"
      >
        <div className="flex items-center justify-between">
          <span className="label">Flame telemetry</span>
          <span className={`font-mono text-[10px] ${cond.gravity < 0.02 ? "text-blue" : "text-amber"}`}>● LIVE</span>
        </div>
        <div className="-my-2 flex justify-center">
          <FlameViz gravity={cond.gravity} o2={cond.o2} size={190} />
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line font-mono text-[11px]">
          {[
            ["Regime", regime],
            ["Buoyant flow", `${buoy.toFixed(1)} cm/s`],
            ["Flammability", `${fi.toFixed(2)}× ISS`],
            ["PSI coverage", `${covered}/${investigations.length}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-black/70 p-2">
              <div className="text-[9px] uppercase tracking-widest text-white/40">{k}</div>
              <div className={`mt-0.5 ${k === "Flammability" && fi > 1.3 ? "text-ember" : "text-white"}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="label mb-1.5">Most relevant data</div>
          {top.map((r) => (
            <div key={r.inv.id} className="flex items-center justify-between border-t border-line py-1.5 text-xs">
              <span className="text-white">{r.inv.acronym}</span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-16 overflow-hidden rounded bg-white/10">
                  <span className="block h-full bg-blue" style={{ width: `${r.score}%` }} />
                </span>
                <span className="w-6 text-right font-mono text-white/70">{r.score}</span>
              </span>
            </div>
          ))}
        </div>
      </motion.aside>

      {/* Bottom destination timeline */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.8 }}
        className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-8 lg:px-12"
      >
        <div className="glass hud mx-auto max-w-5xl p-2">
          <div className="scrollbar-thin flex gap-1 overflow-x-auto">
            {DESTS.map((id) => {
              const d = missions.find((x) => x.id === id)!;
              const active = shot === id;
              return (
                <button
                  key={id}
                  onClick={() => pick(id)}
                  className={`group relative min-w-[118px] flex-1 overflow-hidden rounded px-3 py-2.5 text-left transition ${active ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
                >
                  <div className={`font-mono text-[9px] uppercase tracking-[0.2em] ${active ? "text-black/60" : "text-white/45"}`}>
                    {d.gravity} g · {d.o2}% O₂
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">{d.short}</div>
                  {active && <motion.div layoutId="dest-bar" className="absolute inset-x-0 bottom-0 h-0.5 bg-blue" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          <span>Click a planet or spacecraft · move to look around</span>
          <a href="#ascent" className="pointer-events-auto hidden text-white/70 hover:text-white sm:inline">
            Scroll to ascend ↓
          </a>
        </div>
      </motion.div>
    </header>
  );
}
