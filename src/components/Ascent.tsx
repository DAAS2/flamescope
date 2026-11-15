"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { flammabilityIndex, missions } from "@/lib/missions";
import FlameViz from "./FlameViz";
import { FUEL_META, MISSION_ICON } from "./ui";

const O2_MIN = 12;
// Piecewise scale: the crowded 12–40% band gets 64% of the axis.
const f = (o2: number) => (o2 <= 40 ? ((o2 - O2_MIN) / (40 - O2_MIN)) * 0.64 : 0.64 + ((o2 - 40) / 60) * 0.36);
const inv = (t: number) => (t <= 0.64 ? O2_MIN + (t / 0.64) * (40 - O2_MIN) : 40 + ((t - 0.64) / 0.36) * 60);
const pct = (o2: number) => `${f(o2) * 100}%`;

const ZONES = [
  { o2: 12, t: "Oxygen-starved", d: "Below Earth air. FLEX burned droplets down to about 12% O₂ to find where flames go out." },
  { o2: 19, t: "Earth air", d: "Around 21% O₂, like the ISS. Most microgravity tests were run here, so the data is densest." },
  { o2: 26.5, t: "Exploration atmosphere", d: "26.5 to 34% O₂ at reduced pressure, planned for the Moon Base, rovers and Mars. Materials ignite more easily and burn faster." },
  { o2: 40, t: "High-oxygen frontier", d: "Very few microgravity tests reach this far. Almost every cabin material becomes flammable." },
  { o2: 80, t: "Near-pure oxygen", d: "Spacesuits run on 100% O₂. CFI-G reached 85% in a spherical burner, the highest-oxygen data in PSI." },
];

const EVENTS = [{ o2: 96, t: "Apollo 1, 1967", d: "A spark in a 100% O₂ cabin became a fatal fire in seconds." }];

const HABITATS = missions.filter((m) => m.id !== "earth");
const LABELS = [
  { l: "ISS", o2: 21, icon: "iss", lane: 0, shift: "-50%" },
  { l: "Moon & Mars", o2: 30, icon: "moon-base", lane: 0, shift: "-50%" },
  { l: "Rover", o2: 34, icon: "rover", lane: 1, shift: "-20%" },
  { l: "Spacesuit", o2: 100, icon: "suit", lane: 0, shift: "-100%" },
];
const TICKS = [12, 16, 21, 25, 30, 35, 40, 60, 80, 100];

export default function Ascent({ investigations, onOpen }: { investigations: Investigation[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const markerLeft = useTransform(smooth, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`);
  const [o2, setO2] = useState(12);
  useMotionValueEvent(smooth, "change", (v) => setO2(Math.round(inv(Math.min(1, Math.max(0, v))) * 2) / 2));

  const rows = useMemo(() => [...investigations].sort((a, b) => a.o2[0] - b.o2[0] || a.o2[1] - b.o2[1]), [investigations]);
  const isOn = (r: Investigation) => o2 >= r.o2[0] - 0.5 && o2 <= r.o2[1] + 0.5;
  const active = rows.filter(isOn);
  const solids = active.filter((a) => a.fuelType === "solid").length;
  const zone = [...ZONES].reverse().find((z) => o2 >= z.o2) ?? ZONES[0];
  const fi = flammabilityIndex(o2, 101.3);
  const event = EVENTS.find((e) => o2 >= e.o2);
  const gap = active.length === 0;

  return (
    <section id="ascent" className="relative bg-night text-snow">
      <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-28 sm:px-6">
        <h2 className="max-w-4xl text-[2.4rem] font-semibold leading-[1.02] sm:text-6xl">
          Add oxygen and watch the <span className="text-flame">evidence run out.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-snow-2">
          Scrolling raises cabin oxygen from 12% to 100%. Each bar on the chart is the oxygen range one ISS experiment actually tested. Bars light up when your oxygen level falls inside them. When nothing lights up, nobody has tested it.
        </p>
      </div>

      <div ref={ref} className="relative" style={{ height: "420vh" }}>
        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-16">
          <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-4 sm:px-6 lg:grid-cols-[320px_1fr] lg:gap-8">
            {/* Readout */}
            <div className="flex flex-col gap-4 lg:py-2">
              <div className="flex items-end justify-between gap-4 lg:block">
                <div>
                  <div className="text-[0.85rem] text-snow-3">Cabin oxygen</div>
                  <div className="display tnum flex items-baseline font-semibold leading-none">
                    <span className="text-[3.4rem] sm:text-[6rem]" style={{ color: `color-mix(in oklab, var(--sky), var(--flame) ${Math.min(100, ((o2 - 12) / 40) * 100)}%)` }}>
                      {o2 % 1 ? o2.toFixed(1) : o2}
                    </span>
                    <span className="ml-1 text-3xl text-snow-3">%</span>
                  </div>
                </div>
                <div className="hidden shrink-0 sm:block lg:hidden">
                  <FlameViz gravity={0} o2={o2} size={120} />
                </div>
              </div>
              <div className="sm:min-h-[96px]">
                <AnimatePresence mode="wait">
                  <motion.div key={zone.t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                    <div className="display text-2xl font-semibold">{zone.t}</div>
                    <p className="mt-1.5 hidden text-[0.92rem] leading-relaxed text-snow-2 sm:block">{zone.d}</p>
                    <p className="tnum mt-1 text-[0.85rem] text-snow-2 sm:hidden">
                      {active.length} experiments here · {fi.toFixed(2)}× flammability
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="hidden justify-center lg:flex">
                <FlameViz gravity={0} o2={o2} size={170} />
              </div>
              <div className="hidden grid-cols-2 gap-2 sm:grid">
                <Stat k="Flammability" v={`${fi.toFixed(2)}×`} s="vs ISS air" hot={fi > 1.4} />
                <Stat k="Experiments here" v={`${active.length}`} s={`${solids} on solid materials`} hot={gap} />
              </div>
              <AnimatePresence>
                {(gap || event) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex gap-3 rounded-2xl bg-flame/12 p-3.5 text-[0.88rem] leading-snug text-[#ffd2bf] ring-1 ring-flame/30">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-flame" />
                      <span>{event ? <><b className="text-white">{event.t}.</b> {event.d}</> : <>Data gap. No microgravity experiment has tested {o2}% oxygen.</>}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Coverage chart */}
            <div className="flex min-w-0 flex-col rounded-[28px] bg-white/[0.035] p-4 ring-1 ring-white/8 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[0.78rem] text-snow-3">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-snow-2" /> One bar = the O₂ range one experiment tested
                </span>
                <span className="hidden flex-wrap gap-3 sm:flex">
                  {Object.entries(FUEL_META).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
                      {v.label}
                    </span>
                  ))}
                </span>
              </div>

              <div className="flex min-h-0 flex-1">
                {/* row labels */}
                <div className="w-[68px] shrink-0 pr-2 sm:w-[96px]">
                  <div className="h-[60px]" />
                  {rows.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpen(r.id)}
                      className={`flex h-[clamp(14px,2.6vh,24px)] w-full items-center justify-end truncate text-right text-[clamp(9px,1.4vh,12px)] font-semibold transition-colors ${isOn(r) ? "text-snow" : "text-snow-3/70 hover:text-snow-2"}`}
                    >
                      {r.acronym}
                    </button>
                  ))}
                </div>

                {/* plot */}
                <div className="relative min-w-0 flex-1">
                  {/* habitat header */}
                  <div className="relative h-[60px]">
                    {LABELS.map((h) => {
                      const Icon = MISSION_ICON[h.icon];
                      const reached = o2 >= h.o2;
                      return (
                        <div key={h.l} className="absolute flex" style={{ left: pct(h.o2), top: h.lane * 28, transform: `translateX(${h.shift})` }} title={`${h.l}: ${h.o2}% O₂`}>
                          <span className={`flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[0.68rem] font-semibold transition-colors duration-300 ${reached ? "bg-white text-ink" : "bg-white/8 text-snow-3"}`}>
                            <Icon size={11} />
                            <span className="hidden sm:inline">{h.l}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative">
                    {/* exploration band */}
                    <div className="pointer-events-none absolute inset-y-0 rounded-md bg-flame/[0.07]" style={{ left: pct(26.5), width: `calc(${pct(34)} - ${pct(26.5)})` }} />
                    {/* habitat lines */}
                    {HABITATS.map((h) => (
                      <div key={h.id} className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-white/15" style={{ left: pct(h.o2) }} />
                    ))}
                    {rows.map((r, i) => {
                      const on = isOn(r);
                      const col = FUEL_META[r.fuelType].color;
                      return (
                        <div key={r.id} className="relative h-[clamp(14px,2.6vh,24px)]">
                          <button
                            onClick={() => onOpen(r.id)}
                            title={`${r.acronym}: ${r.o2[0]}–${r.o2[1]}% O₂`}
                            className="absolute top-1/2 h-[55%] -translate-y-1/2 rounded-full transition-[opacity,box-shadow] duration-300"
                            style={{
                              left: pct(r.o2[0]),
                              width: `max(10px, calc(${pct(r.o2[1])} - ${pct(r.o2[0])}))`,
                              background: col,
                              opacity: on ? 1 : 0.18,
                              boxShadow: on ? `0 0 18px -2px ${col}` : "none",
                              transitionDelay: `${i * 4}ms`,
                            }}
                          />
                        </div>
                      );
                    })}
                    {/* you-are-here marker */}
                    <motion.div className="pointer-events-none absolute -bottom-2 -top-2 z-10 w-0" style={{ left: markerLeft }}>
                      <div className="absolute inset-y-0 -left-px w-[2px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
                    </motion.div>
                  </div>

                  {/* axis */}
                  <div className="relative mt-3 h-8 border-t border-white/10">
                    {TICKS.map((t) => (
                      <span key={t} className={`tnum absolute top-2 -translate-x-1/2 text-[0.72rem] text-snow-3 ${[16, 25, 35, 60, 80].includes(t) ? "hidden sm:block" : ""}`} style={{ left: pct(t) }}>
                        {t}%
                      </span>
                    ))}
                    <motion.span className="tnum absolute -top-3 z-10 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[0.72rem] font-bold text-ink" style={{ left: markerLeft }}>
                      {o2}%
                    </motion.span>
                  </div>
                  <div className="mt-1 flex justify-between text-[0.72rem] text-snow-3">
                    <span>Less oxygen</span>
                    <span className="hidden text-flame/80 sm:inline">Shaded: exploration atmosphere</span>
                    <span>More oxygen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v, s, hot }: { k: string; v: string; s: string; hot?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/8">
      <div className="text-[0.75rem] text-snow-3">{k}</div>
      <div className={`display tnum text-2xl font-semibold ${hot ? "text-flame" : ""}`}>{v}</div>
      <div className="text-[0.72rem] text-snow-3">{s}</div>
    </div>
  );
}
