"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDown, MousePointer2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { flammabilityIndex, missions, type Mission } from "@/lib/missions";
import { rank, type Conditions } from "@/lib/scoring";
import FlameViz from "./FlameViz";
import { MISSION_ICON } from "./ui";

const SpaceScene = dynamic(() => import("./three/SpaceScene"), { ssr: false, loading: () => null });

const DESTS = ["earth", "iss", "suit", "moon-base", "rover", "mars"];
const EASE = [0.22, 1, 0.36, 1] as const;

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
  const [tele, setTele] = useState(false);
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
  const ranked = useMemo(() => rank(investigations, cond), [investigations, cond]);
  const covered = ranked.filter((r) => r.covers).length;
  const regime = cond.gravity < 0.02 ? "Spherical, diffusion-limited" : cond.gravity < 0.5 ? "Weak buoyant plume" : "Buoyant teardrop";
  const buoy = Math.sqrt(cond.gravity * 9.81 * 0.01) * 100;

  return (
    <header id="top" className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-night text-snow">
      <div className="absolute inset-0">
        <SpaceScene shot={shot} onPick={pick} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,transparent_30%,rgba(7,10,20,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-night to-transparent" />

      {/* Headline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex h-full max-w-[1240px] flex-col justify-center px-4 pb-40 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 1, ease: EASE }} className="max-w-2xl">
          <h1 className="text-[3.1rem] font-semibold leading-[0.98] sm:text-[5rem] xl:text-[6.2rem]">
            Fire behaves <span className="text-flame">differently</span> up here.
          </h1>
          <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-snow-2 sm:text-[1.15rem]">
            FlameScope turns twenty NASA microgravity combustion experiments into fire safety guidance for every crewed destination. Choose one to begin.
          </p>
        </motion.div>
      </div>

      {/* Location readout */}
      <div className="pointer-events-none absolute right-4 top-24 hidden text-right sm:block sm:right-6 lg:right-[max(1.5rem,calc((100vw-1240px)/2+1.5rem))]">
        <AnimatePresence mode="wait">
          <motion.div key={shot + missionId} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.35 }}>
            <div className="text-[0.8rem] text-snow-3">{shot === "overview" ? "Viewing" : "Destination"}</div>
            <div className="display text-xl font-semibold sm:text-2xl">{shot === "overview" ? "Cislunar space" : m?.name ?? "Custom atmosphere"}</div>
            <div className="tnum mt-1 text-[0.85rem] text-snow-2">
              {cond.o2}% O₂ · {cond.pressure} kPa · {cond.gravity} g
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Telemetry: opens on demand, docks above the destination bar */}
      <AnimatePresence>
        {tele && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="frost absolute bottom-[8.5rem] right-4 z-10 w-[calc(100vw-2rem)] max-w-[340px] rounded-[28px] p-5 sm:right-6 lg:right-[max(1.5rem,calc((100vw-1240px)/2+1.5rem))]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[0.8rem] text-snow-3">Live flame model</div>
                <div className="display text-lg font-semibold">{m?.short ?? "Custom"}</div>
              </div>
              <button onClick={() => setTele(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 hover:bg-white/15" aria-label="Close telemetry">
                <X size={15} />
              </button>
            </div>
            <div className="-my-1 flex justify-center">
              <FlameViz gravity={cond.gravity} o2={cond.o2} size={170} />
            </div>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Flame shape", regime],
                ["Buoyant flow", `${buoy.toFixed(1)} cm/s`],
                ["Flammability", `${fi.toFixed(2)}× ISS`],
                ["Tested here", `${covered} of ${investigations.length}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/6 px-3 py-2.5">
                  <dt className="text-[0.72rem] text-snow-3">{k}</dt>
                  <dd className={`tnum mt-0.5 text-[0.88rem] font-semibold ${k === "Flammability" && fi > 1.3 ? "text-flame" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 text-[0.75rem] text-snow-3">Most relevant experiments</div>
            <div className="mt-1.5 space-y-1.5">
              {ranked.slice(0, 3).map((r) => (
                <div key={r.inv.id} className="flex items-center gap-3 text-[0.85rem]">
                  <span className="w-20 font-semibold">{r.inv.acronym}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.span className="block h-full rounded-full bg-sky" animate={{ width: `${r.score}%` }} />
                  </span>
                  <span className="tnum w-7 text-right text-snow-2">{r.score}</span>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Destination dock */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.9, ease: EASE }} className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 lg:flex-row lg:items-end">
          <div className="frost no-scrollbar flex flex-1 gap-1 overflow-x-auto rounded-[26px] p-1.5">
            {DESTS.map((id) => {
              const d = missions.find((x) => x.id === id)!;
              const active = shot === id;
              const Icon = MISSION_ICON[id];
              return (
                <button key={id} onClick={() => pick(id)} className="relative flex min-w-[150px] flex-1 items-center gap-3 rounded-[20px] px-3 py-2.5 text-left">
                  {active && <motion.span layoutId="dest-pill" className="absolute inset-0 rounded-[20px] bg-white" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? "bg-blue text-white" : "bg-white/8 text-snow-2"}`}>
                    <Icon size={17} />
                  </span>
                  <span className="relative">
                    <span className={`block text-[0.92rem] font-semibold transition-colors ${active ? "text-ink" : "text-snow"}`}>{d.short}</span>
                    <span className={`tnum block text-[0.75rem] transition-colors ${active ? "text-ink-3" : "text-snow-3"}`}>
                      {d.o2}% O₂ · {d.gravity} g
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end">
            <button
              onClick={() => setTele((t) => !t)}
              aria-pressed={tele}
              className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-[0.9rem] font-semibold transition ${tele ? "bg-white text-ink" : "frost text-snow hover:bg-white/15"}`}
            >
              <Activity size={16} className={tele ? "text-flame" : ""} />
              {tele ? "Hide flame model" : "Show flame model"}
            </button>
            <div className="hidden items-center gap-4 text-[0.8rem] text-snow-3 sm:flex lg:hidden xl:flex">
              <span className="inline-flex items-center gap-1.5">
                <MousePointer2 size={13} /> Click a planet or craft
              </span>
              <a href="#ascent" className="pointer-events-auto inline-flex items-center gap-1.5 text-snow-2 hover:text-snow">
                Scroll <ArrowDown size={13} />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </header>
  );
}
