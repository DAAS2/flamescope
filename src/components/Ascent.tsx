"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { flammabilityIndex, missions } from "@/lib/missions";
import FlameViz from "./FlameViz";
import { FUEL_META } from "./ui";

const O2_MIN = 12,
  O2_MAX = 100;
// Piecewise scale: the crowded 12–40% band gets 64% of the journey.
const f = (o2: number) => (o2 <= 40 ? ((o2 - O2_MIN) / (40 - O2_MIN)) * 0.64 : 0.64 + ((o2 - 40) / 60) * 0.36);
const inv = (t: number) => (t <= 0.64 ? O2_MIN + (t / 0.64) * (40 - O2_MIN) : 40 + ((t - 0.64) / 0.36) * 60);

const ZONES = [
  { o2: 12, t: "Oxygen-starved", d: "Below Earth air. FLEX burned droplets down to ~12% O₂ to find where flames die." },
  { o2: 21, t: "Earth air", d: "21% O₂: the ISS and most microgravity tests. The data is densest here." },
  { o2: 26.5, t: "Exploration zone", d: "26.5–34% O₂ at reduced pressure: planned for the Moon Base, rovers and Mars. Materials burn faster and more easily." },
  { o2: 40, t: "High-oxygen frontier", d: "Few microgravity tests reach here. Almost every cabin material becomes flammable." },
  { o2: 85, t: "Near-pure oxygen", d: "CFI-G pushed 85% O₂ through a spherical burner, the highest-oxygen data in PSI." },
];

const EVENTS = [
  { o2: 100, t: "Apollo 1 · 1967", d: "100% O₂ on the pad at 16.7 psi. A spark became a fatal fire in seconds.", c: "#ff5a36" },
  { o2: 100, t: "Spacesuits", d: "100% O₂ at 4.3 psi. Pre-breathe protocols drive habitats toward ~30% O₂.", c: "#ffb347", dy: 120 },
];

export default function Ascent({ investigations, onOpen }: { investigations: Investigation[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const [o2, setO2] = useState(21);
  useMotionValueEvent(scrollYProgress, "change", (v) => setO2(Math.round(inv(Math.min(1, Math.max(0, v))) * 2) / 2));

  const rails = useMemo(() => [...investigations].sort((a, b) => a.o2[1] - a.o2[0] - (b.o2[1] - b.o2[0]) || a.o2[0] - b.o2[0]), [investigations]);
  const active = rails.filter((r) => o2 >= r.o2[0] - 0.5 && o2 <= r.o2[1] + 0.5);
  const zone = [...ZONES].reverse().find((z) => o2 >= z.o2) ?? ZONES[0];
  const fi = flammabilityIndex(o2, 101.3);
  const heat = Math.min(1, (o2 - 12) / 70);

  return (
    <section id="ascent" className="relative" style={{ background: "linear-gradient(180deg,#000 0%,#020a1c 12%,#06122a 35%,#1a0d22 62%,#3a0d08 88%,#000 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <div className="mb-4 flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-blue">
          <span className="h-px w-8 bg-blue" />
          The Oxygen Ascent
        </div>
        <h2 className="max-w-4xl font-display text-4xl font-semibold uppercase leading-none tracking-tight sm:text-6xl">
          Scroll up the oxygen scale. <span className="text-gradient-warm">Watch the fire grow.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-ink-2">
          Each glowing rail is the oxygen range a real ISS investigation tested. As you scroll, the rails that cover your oxygen level light up, and the gaps show where crews will live with no microgravity data behind them.
        </p>
      </div>

      <div ref={ref} className="relative mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-[300px_1fr]" style={{ height: "560vh" }}>
        {/* Sticky gauge */}
        <div className="pointer-events-none sticky top-24 z-10 h-fit md:pointer-events-auto">
          <div className="glass hud p-5" style={{ boxShadow: `0 0 80px -20px rgba(${Math.round(79 + 176 * heat)},${Math.round(195 - 120 * heat)},${Math.round(255 - 200 * heat)},0.6)` }}>
            <div className="label">Cabin oxygen</div>
            <div className="mt-1 flex items-baseline gap-1 font-display font-bold leading-none">
              <span className="text-6xl tabular-nums sm:text-7xl" style={{ color: `rgb(${Math.round(79 + 176 * heat)},${Math.round(195 - 110 * heat)},${Math.round(255 - 205 * heat)})` }}>
                {o2.toFixed(o2 % 1 ? 1 : 0)}
              </span>
              <span className="text-2xl text-white/50">%</span>
            </div>
            <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-white">{zone.t}</div>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">{zone.d}</p>
            <div className="hidden justify-center md:flex">
              <FlameViz gravity={0} o2={o2} size={170} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line font-mono text-[11px]">
              <div className="bg-black/70 p-2">
                <div className="text-[9px] uppercase tracking-widest text-white/40">Flammability</div>
                <div className={fi > 1.4 ? "text-ember" : "text-white"}>{fi.toFixed(2)}× ISS</div>
              </div>
              <div className="bg-black/70 p-2">
                <div className="text-[9px] uppercase tracking-widest text-white/40">µg datasets here</div>
                <div className={active.length === 0 ? "text-ember" : "text-green"}>{active.length} / {investigations.length}</div>
              </div>
            </div>
            <div className="mt-2 hidden flex-wrap gap-1 md:flex">
              {active.slice(0, 10).map((a) => (
                <span key={a.id} className="rounded-sm border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                  {a.acronym}
                </span>
              ))}
              {active.length === 0 && <span className="font-mono text-[10px] text-ember">⚠ DATA GAP: no microgravity tests at this O₂</span>}
            </div>
          </div>
        </div>

        {/* Journey track */}
        <div className="relative">
          {/* O₂ ruler */}
          {[12, 15, 18, 21, 25, 30, 35, 40, 50, 60, 70, 85, 100].map((t) => (
            <div key={t} className="absolute left-0 right-0 flex items-center gap-3" style={{ top: `${f(t) * 100}%` }}>
              <span className="w-10 text-right font-mono text-[10px] text-white/35">{t}%</span>
              <span className="h-px flex-1 bg-white/[0.06]" />
            </div>
          ))}

          {/* Zone titles */}
          {ZONES.map((z) => (
            <motion.div
              key={z.t}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ margin: "-30% 0px -30% 0px" }}
              transition={{ duration: 0.7 }}
              className="absolute left-14 max-w-[46%]"
              style={{ top: `calc(${f(z.o2) * 100}% + 18px)` }}
            >
              <div className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-white/90 sm:text-5xl">{z.t}</div>
            </motion.div>
          ))}

          {/* Habitats */}
          {missions
            .filter((m) => m.id !== "earth")
            .map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20%" }}
                className="absolute left-14 flex items-center gap-3"
                style={{ top: `calc(${f(m.o2) * 100}% + ${80 + (m.o2 === 30 ? (m.id === "mars" ? 64 : 0) : 0)}px)` }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-lg backdrop-blur">{m.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="font-mono text-[10px] text-white/50">
                    {m.o2}% O₂ · {m.pressure} kPa · {m.gravity} g
                  </div>
                </div>
              </motion.div>
            ))}

          {EVENTS.map((e) => (
            <motion.div
              key={e.t}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass hud absolute left-14 max-w-xs p-4"
              style={{ top: `calc(${f(e.o2) * 100}% - ${260 - (e.dy ?? 0)}px)`, borderColor: e.c }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: e.c }}>
                {e.t}
              </div>
              <p className="mt-1 text-sm text-ink-2">{e.d}</p>
            </motion.div>
          ))}

          {/* Investigation rails */}
          <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block">
            {rails.map((r, i) => {
              const on = o2 >= r.o2[0] - 0.5 && o2 <= r.o2[1] + 0.5;
              const col = FUEL_META[r.fuelType].color;
              const top = f(r.o2[0]) * 100;
              const h = Math.max(0.35, (f(r.o2[1]) - f(r.o2[0])) * 100);
              return (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className="group absolute flex w-5 flex-col items-center"
                  style={{ left: `${(i / rails.length) * 100}%`, top: `${top}%`, height: `${h}%` }}
                  title={`${r.acronym}: ${r.o2[0]}–${r.o2[1]}% O₂`}
                >
                  <span
                    className="w-[3px] flex-1 rounded-full transition-all duration-300"
                    style={{ background: col, opacity: on ? 1 : 0.22, boxShadow: on ? `0 0 14px ${col}` : "none", minHeight: 10 }}
                  />
                  <span
                    className="absolute -top-2 origin-bottom-left -rotate-45 whitespace-nowrap font-mono text-[10px] transition-colors"
                    style={{ color: on ? "#fff" : "rgba(255,255,255,0.35)", transform: "translate(6px,-4px) rotate(-45deg)" }}
                  >
                    {r.acronym}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
