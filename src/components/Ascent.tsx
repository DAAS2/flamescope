"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { AlertTriangle, ArrowDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FuelType, Investigation } from "@/data/investigations";
import { flammabilityIndex, missions, type Mission } from "@/lib/missions";
import FlameViz from "./FlameViz";
import { FUEL_META, MISSION_ICON } from "./ui";

const O2_MIN = 12;
// Piecewise depth scale: the crowded 12–40% band gets 64% of the descent.
const f = (o2: number) => (o2 <= 40 ? ((o2 - O2_MIN) / (40 - O2_MIN)) * 0.64 : 0.64 + ((o2 - 40) / 60) * 0.36);
const inv = (t: number) => (t <= 0.64 ? O2_MIN + (t / 0.64) * (40 - O2_MIN) : 40 + ((t - 0.64) / 0.36) * 60);
const pct = (o2: number) => `${f(o2) * 100}%`;

const ZONES = [
  { o2: 12, t: "Oxygen-starved", d: "Below Earth air. FLEX burned droplets down to about 12% O₂ to find where flames go out." },
  { o2: 17.5, t: "Earth air", d: "Around 21% O₂, like the ISS. Most microgravity tests were run here, so the data is densest." },
  { o2: 25, t: "Exploration atmosphere", d: "26.5 to 34% O₂ at reduced pressure, planned for the Moon Base, rovers and Mars. Materials ignite more easily and burn faster." },
  { o2: 40, t: "High-oxygen frontier", d: "Very few microgravity tests reach this far. Almost every cabin material becomes flammable." },
  { o2: 70, t: "Near-pure oxygen", d: "CFI-G reached 85% O₂ in a spherical burner, the highest-oxygen data in NASA's archive." },
];

const EVENTS = [{ o2: 86, t: "Apollo 1, 1967", d: "A spark in a 100% O₂ cabin became a fatal fire in seconds. Oxygen became NASA's number one flammability variable." }];

const SPHERE: Record<string, string> = {
  earth: "radial-gradient(circle at 32% 28%, #b8e6ff 0%, #2f7bff 38%, #0b3a8c 70%, #04122e 100%)",
  iss: "radial-gradient(circle at 32% 28%, #ffffff 0%, #c9d2e3 35%, #6b7690 75%, #2a3142 100%)",
  "moon-base": "radial-gradient(circle at 32% 28%, #ffffff 0%, #c8c8c8 35%, #7d7d7d 70%, #2e2e2e 100%)",
  mars: "radial-gradient(circle at 32% 28%, #ffd0b0 0%, #e0683a 38%, #9b2e12 72%, #3a0d05 100%)",
  rover: "radial-gradient(circle at 32% 28%, #fff1dc 0%, #e5c08f 38%, #a77945 72%, #3f2a12 100%)",
  suit: "radial-gradient(circle at 32% 28%, #ffffff 0%, #ffd9c4 35%, #ff6a2b 75%, #6b1a00 100%)",
};

const FUEL_ORDER: FuelType[] = ["solid", "liquid", "gas", "aerosol"];
const TICKS = [12, 15, 18, 21, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100];

const covers = (r: Investigation, o2: number) => o2 >= r.o2[0] - 0.5 && o2 <= r.o2[1] + 0.5;

export default function Ascent({ investigations, onOpen }: { investigations: Investigation[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.35 });
  const depth = useTransform(smooth, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`);
  const [o2, setO2] = useState(12);
  useMotionValueEvent(smooth, "change", (v) => setO2(Math.round(inv(Math.min(1, Math.max(0, v))) * 2) / 2));

  const rails = useMemo(
    () => [...investigations].sort((a, b) => FUEL_ORDER.indexOf(a.fuelType) - FUEL_ORDER.indexOf(b.fuelType) || a.o2[0] - b.o2[0] || a.o2[1] - b.o2[1]),
    [investigations],
  );
  // Coverage curve: how many experiments tested each oxygen level.
  const curve = useMemo(() => {
    const pts: { o2: number; n: number }[] = [];
    for (let x = 12; x <= 100; x += 0.5) pts.push({ o2: x, n: investigations.filter((r) => covers(r, x)).length });
    return pts;
  }, [investigations]);
  const maxN = Math.max(1, ...curve.map((p) => p.n));

  // Destinations grouped by oxygen level (Moon Base and Mars share 30%).
  const stops = useMemo(() => {
    const g = new Map<number, Mission[]>();
    missions.filter((m) => m.id !== "custom").forEach((m) => g.set(m.o2, [...(g.get(m.o2) ?? []), m]));
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  const active = rails.filter((r) => covers(r, o2));
  const solids = active.filter((a) => a.fuelType === "solid").length;
  const zone = [...ZONES].reverse().find((z) => o2 >= z.o2) ?? ZONES[0];
  const fi = flammabilityIndex(o2, 101.3);
  const event = EVENTS.find((e) => o2 >= e.o2);
  const gap = active.length === 0;
  const next = stops.find(([x]) => x > o2);
  const heat = Math.min(100, ((o2 - 12) / 40) * 100);
  const o2Color = `color-mix(in oklab, var(--sky), var(--flame) ${heat}%)`;

  return (
    <section
      id="ascent"
      className="relative overflow-clip text-snow"
      style={{ background: "linear-gradient(180deg,#070a14 0%,#08112a 18%,#0b1636 40%,#1c0f2a 64%,#3a1208 88%,#070a14 100%)" }}
    >
      <div className="mx-auto max-w-[1240px] px-4 pb-6 pt-28 sm:px-6">
        <h2 className="max-w-4xl text-[2.4rem] font-semibold leading-[1.02] sm:text-6xl">
          Descend through the oxygen scale. <span className="text-flame">Watch the evidence run out.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-snow-2">
          The deeper you scroll, the more oxygen in the cabin, from 12% to 100%. You pass every crewed destination on the way down. Each coloured bar is the oxygen range one ISS experiment actually tested, and it lights up while you are inside it.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-[0.85rem] text-snow-3">
          <ArrowDown size={15} className="animate-bounce" /> Scroll to descend
        </div>
      </div>

      <div ref={ref} className="relative mx-auto max-w-[1240px] px-4 sm:px-6" style={{ height: "540vh" }}>
        {/* Descent track */}
        <div className="absolute inset-y-0 left-4 right-4 sm:left-6 sm:right-6 md:left-[360px]">
          {/* depth ruler */}
          {TICKS.map((t) => (
            <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-3" style={{ top: pct(t) }}>
              <span className="tnum w-9 shrink-0 text-right text-[0.72rem] text-snow-3/70">{t}%</span>
              <span className="h-px flex-1 bg-white/[0.06]" />
            </div>
          ))}

          {/* exploration band */}
          <div className="pointer-events-none absolute inset-x-0 border-y border-dashed border-flame/30 bg-flame/[0.06]" style={{ top: pct(26.5), height: `calc(${pct(34)} - ${pct(26.5)})` }}>
            <span className="absolute right-2 top-2 text-[0.7rem] font-semibold text-flame/80">Exploration atmospheres 26.5–34%</span>
          </div>

          {/* zone chapters */}
          {ZONES.map((z) => (
            <motion.div
              key={z.t}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ margin: "-25% 0px -25% 0px" }}
              transition={{ duration: 0.6 }}
              className="absolute left-12 w-[56%] max-w-[380px]"
              style={{ top: `calc(${pct(z.o2)} + 14px)` }}
            >
              <div className="display text-[1.7rem] font-semibold leading-none text-white sm:text-[2.6rem]">{z.t}</div>
              <p className="mt-2 hidden text-[0.9rem] leading-relaxed text-snow-2 sm:block">{z.d}</p>
            </motion.div>
          ))}

          {/* destination stops */}
          {stops.map(([x, ms]) => {
            const n = investigations.filter((r) => covers(r, x)).length;
            const reached = o2 >= x;
            return (
              <motion.div
                key={x}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.6 }}
                className="absolute left-12 flex w-[56%] max-w-[400px] flex-col gap-2"
                style={{ top: pct(x), transform: x >= 100 ? "translateY(-100%)" : "translateY(-50%)" }}
              >
                {ms.map((m) => {
                  const Icon = MISSION_ICON[m.id] ?? MISSION_ICON.habitat;
                  const mfi = flammabilityIndex(m.o2, m.pressure);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-[22px] p-2.5 pr-4 backdrop-blur-md transition-all duration-500 ${reached ? "bg-white/[0.1] ring-1 ring-white/25" : "bg-white/[0.04] ring-1 ring-white/8"}`}
                    >
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[inset_-6px_-8px_14px_rgba(0,0,0,0.45)] sm:h-14 sm:w-14" style={{ background: SPHERE[m.id] ?? SPHERE.iss }}>
                        <Icon size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        {reached && <span className="absolute -inset-1 rounded-full ring-2 ring-white/40" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.95rem] font-semibold text-white">{m.name}</div>
                        <div className="tnum text-[0.75rem] text-snow-3">
                          {m.o2}% O₂ · {m.pressure} kPa · {m.gravity} g
                        </div>
                      </div>
                      <div className="hidden shrink-0 gap-3 text-right sm:flex">
                        <div>
                          <div className={`display tnum text-lg font-semibold leading-none ${n <= 2 ? "text-flame" : "text-go"}`}>{n}</div>
                          <div className="text-[0.65rem] text-snow-3">tests</div>
                        </div>
                        <div>
                          <div className={`display tnum text-lg font-semibold leading-none ${mfi > 1.3 ? "text-flame" : "text-white"}`}>{mfi.toFixed(1)}×</div>
                          <div className="text-[0.65rem] text-snow-3">flamm.</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}

          {/* Apollo 1 */}
          {EVENTS.map((e) => (
            <motion.div
              key={e.t}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="absolute left-12 w-[56%] max-w-[360px] rounded-2xl bg-ember/15 p-4 ring-1 ring-ember/40"
              style={{ top: pct(e.o2) }}
            >
              <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ember">
                <AlertTriangle size={14} /> {e.t}
              </div>
              <p className="mt-1 text-[0.85rem] leading-relaxed text-snow-2">{e.d}</p>
            </motion.div>
          ))}

          {/* experiment rails */}
          <div className="absolute inset-y-0 right-0 w-[36%] sm:w-[38%]">
            {rails.map((r, i) => {
              const on = covers(r, o2);
              const col = FUEL_META[r.fuelType].color;
              const h = Math.max(0.5, (f(r.o2[1]) - f(r.o2[0])) * 100);
              return (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  title={`${r.acronym}: ${r.o2[0]}–${r.o2[1]}% O₂`}
                  className="group absolute flex justify-center"
                  style={{ left: `${(i / rails.length) * 100}%`, width: `${100 / rails.length}%`, top: pct(r.o2[0]), height: `${h}%` }}
                >
                  <span
                    className="block w-[5px] rounded-full transition-all duration-300 group-hover:w-[9px] sm:w-[9px]"
                    style={{ background: col, opacity: on ? 1 : 0.25, boxShadow: on ? `0 0 16px ${col}` : "none", minHeight: 14 }}
                  />
                  <span
                    className="absolute bottom-full mb-1.5 hidden text-[0.68rem] font-semibold transition-colors md:block"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: on ? "#fff" : "rgba(255,255,255,0.4)" }}
                  >
                    {r.acronym}
                  </span>
                </button>
              );
            })}
          </div>

          {/* depth marker */}
          <motion.div className="pointer-events-none absolute inset-x-0 z-10 h-0" style={{ top: depth }}>
            <div className="absolute inset-x-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/70 to-white shadow-[0_0_14px_rgba(255,255,255,0.6)]" />
            <span className="tnum absolute right-0 -translate-y-1/2 rounded-full bg-white px-2.5 py-0.5 text-[0.75rem] font-bold text-ink shadow-lg">
              {o2}% · {active.length} tests
            </span>
          </motion.div>
        </div>

        {/* Sticky gauge */}
        <div className="sticky top-16 z-20 w-full pt-2 md:top-20 md:w-[330px]">
          <div className="rounded-[26px] bg-[#0b1020]/85 p-4 ring-1 ring-white/10 backdrop-blur-xl md:p-5" style={{ boxShadow: `0 0 70px -24px ${o2Color}` }}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[0.8rem] text-snow-3">Cabin oxygen</div>
                <div className="display tnum flex items-baseline font-semibold leading-none">
                  <span className="text-[2.8rem] md:text-[4.6rem]" style={{ color: o2Color }}>
                    {o2 % 1 ? o2.toFixed(1) : o2}
                  </span>
                  <span className="ml-1 text-2xl text-snow-3">%</span>
                </div>
              </div>
              <div className="text-right md:hidden">
                <div className={`display tnum text-2xl font-semibold ${gap ? "text-flame" : "text-go"}`}>{active.length}</div>
                <div className="text-[0.7rem] text-snow-3">tests here · {fi.toFixed(1)}× flamm.</div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={zone.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-1">
                <div className="display text-lg font-semibold md:text-xl">{zone.t}</div>
              </motion.div>
            </AnimatePresence>

            <div className="hidden md:block">
              <div className="-my-2 flex justify-center">
                <FlameViz gravity={0} o2={o2} size={140} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat k="Flammability" v={`${fi.toFixed(2)}×`} s="vs ISS air" hot={fi > 1.4} />
                <Stat k="Tests here" v={`${active.length}`} s={`of ${investigations.length}`} hot={gap} good={active.length >= 5} />
                <Stat k="Solid fuels" v={`${solids}`} s="cabin materials" hot={solids === 0} />
              </div>

              {/* coverage curve */}
              <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/8">
                <div className="mb-1.5 flex items-center justify-between text-[0.72rem] text-snow-3">
                  <span>Experiments covering each O₂ level</span>
                  <span className="tnum">max {maxN}</span>
                </div>
                <Coverage curve={curve} maxN={maxN} o2={o2} />
              </div>

              <div className="mt-3 flex items-center justify-between text-[0.8rem]">
                <span className="text-snow-3">Next stop</span>
                <span className="font-semibold">{next ? `${next[1].map((m) => m.short).join(" & ")} at ${next[0]}%` : "Bottom of the scale"}</span>
              </div>
            </div>

            <AnimatePresence>
              {(gap || event) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 flex gap-2.5 rounded-2xl bg-flame/12 p-3 text-[0.82rem] leading-snug text-[#ffd2bf] ring-1 ring-flame/30">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-flame" />
                    <span>{gap ? <>Data gap. No microgravity experiment has tested {o2}% oxygen.</> : <><b className="text-white">{event!.t}.</b> 100% O₂ is where NASA learned this lesson.</>}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* fuel legend */}
          <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1.5 px-1 text-[0.75rem] text-snow-3 md:flex">
            {FUEL_ORDER.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_META[k].color }} />
                {FUEL_META[k].label}
              </span>
            ))}
            <span className="w-full text-[0.7rem]">Bars on the right: one per experiment. Click to open.</span>
          </div>
        </div>
      </div>
      <div className="h-24" />
    </section>
  );
}

function Coverage({ curve, maxN, o2 }: { curve: { o2: number; n: number }[]; maxN: number; o2: number }) {
  const W = 280,
    H = 70;
  const x = (v: number) => f(v) * W;
  const y = (n: number) => H - (n / maxN) * (H - 4);
  let d = `M0 ${H}`;
  curve.forEach((p, i) => {
    const px = x(p.o2);
    d += i === 0 ? ` L${px} ${y(p.n)}` : ` H${px} V${y(p.n)}`;
  });
  d += ` H${W} V${H} Z`;
  const cur = curve.reduce((a, b) => (Math.abs(b.o2 - o2) < Math.abs(a.o2 - o2) ? b : a));
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="h-auto w-full" role="img" aria-label="Number of experiments covering each oxygen level">
      <defs>
        <linearGradient id="covfill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#59c2ff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#ff6a2b" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect x={x(26.5)} y={0} width={x(34) - x(26.5)} height={H} fill="rgba(255,106,43,0.12)" />
      <path d={d} fill="url(#covfill)" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <line x1={x(o2)} x2={x(o2)} y1={0} y2={H} stroke="#fff" strokeWidth="1.5" />
      <circle cx={x(o2)} cy={y(cur.n)} r={3.5} fill="#fff" />
      {[12, 21, 30, 40, 100].map((t) => (
        <text key={t} x={x(t)} y={H + 12} fill="#8a91a5" fontSize="9" textAnchor={t === 12 ? "start" : t === 100 ? "end" : "middle"}>
          {t}%
        </text>
      ))}
    </svg>
  );
}

function Stat({ k, v, s, hot, good }: { k: string; v: string; s: string; hot?: boolean; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-2.5 py-2.5 ring-1 ring-white/8">
      <div className="text-[0.68rem] text-snow-3">{k}</div>
      <div className={`display tnum text-xl font-semibold ${hot ? "text-flame" : good ? "text-go" : ""}`}>{v}</div>
      <div className="text-[0.65rem] text-snow-3">{s}</div>
    </div>
  );
}
