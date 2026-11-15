"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { FuelType, Investigation } from "@/data/investigations";
import { missions } from "@/lib/missions";
import type { Conditions } from "@/lib/scoring";
import { FUEL_META, Section } from "./ui";

const W = 900,
  H = 520,
  M = { l: 64, r: 24, t: 24, b: 56 };
const iw = W - M.l - M.r,
  ih = H - M.t - M.b;

// Piecewise O₂ axis so 10–50% (where most data lives) gets 78% of the width.
const xs = (o2: number) => (o2 <= 50 ? ((o2 - 10) / 40) * 0.78 * iw : 0.78 * iw + ((o2 - 50) / 50) * 0.22 * iw) + M.l;
const ys = (p: number) => M.t + ih - ((p - 20) / 290) * ih;

const ixs = (x: number) => { const t = (x - M.l) / iw; return t <= 0.78 ? 10 + (t / 0.78) * 40 : 50 + ((t - 0.78) / 0.22) * 50; };
const iys = (y: number) => 20 + ((M.t + ih - y) / ih) * 290;

export default function Envelope({ investigations, cond, onOpen, setCond }: { investigations: Investigation[]; cond: Conditions; onOpen: (id: string) => void; setCond?: (c: Conditions) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState(false);
  const moveTo = (e: React.PointerEvent) => {
    if (!setCond || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const v = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    const o2 = Math.round(Math.min(100, Math.max(10, ixs(v.x))));
    const pr = Math.round(Math.min(310, Math.max(20, iys(v.y))) * 10) / 10;
    setCond({ ...cond, o2, pressure: pr });
  };
  const inside = investigations.filter((i) => cond.o2 >= i.o2[0] - 1 && cond.o2 <= i.o2[1] + 1 && cond.pressure >= i.pressure[0] - 6 && cond.pressure <= i.pressure[1] + 6);
  const [hover, setHover] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<FuelType>>(new Set());
  const hov = investigations.find((i) => i.id === hover);

  const rects = useMemo(
    () =>
      investigations
        .filter((i) => !hidden.has(i.fuelType))
        .map((i, idx) => {
          let x0 = xs(i.o2[0]),
            x1 = xs(i.o2[1]),
            y0 = ys(i.pressure[1]),
            y1 = ys(i.pressure[0]);
          const minW = 10;
          // small deterministic jitter so overlapping 21% / 101 kPa tests stay visible
          const j = ((idx * 37) % 9) - 4;
          if (x1 - x0 < minW) {
            const c = (x0 + x1) / 2 + j * 2.2;
            x0 = c - minW / 2;
            x1 = c + minW / 2;
          }
          if (y1 - y0 < minW) {
            const c = (y0 + y1) / 2 + j * 2.2;
            y0 = c - minW / 2;
            y1 = c + minW / 2;
          }
          return { i, x0, x1, y0, y1 };
        })
        .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0)),
    [investigations, hidden],
  );

  const xTicks = [10, 21, 30, 40, 50, 70, 85, 100];
  const yTicks = [30, 50, 70, 101, 150, 200, 250, 300];

  return (
    <Section
      id="envelope"
      eyebrow="02 · Flammability Envelope"
      title={
        <>
          Where we have data, <span className="italic text-gradient-warm">and where we don&apos;t.</span>
        </>
      }
      intro="Each box is the oxygen × pressure range an investigation actually tested in microgravity. Moon Base and rover atmospheres sit in a sparsely tested region, and no solid-material data reaches it."
    >
      <div className="glass hud relative overflow-hidden rounded-xl p-3 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(FUEL_META) as FuelType[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                const n = new Set(hidden);
                if (n.has(f)) n.delete(f);
                else n.add(f);
                setHidden(n);
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${hidden.has(f) ? "border-line text-ink-3 opacity-50" : "border-line-2 text-ink"}`}
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FUEL_META[f].color }} />
              {FUEL_META[f].label}
            </button>
          ))}
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-blue sm:inline">Drag anywhere to move your mission · click a box to open</span>
        </div>

        <div className="relative w-full">
          <svg ref={svgRef} onPointerDown={(e) => { if ((e.target as Element).tagName === "rect" && !(e.target as Element).getAttribute("data-bg")) return; setDrag(true); (e.currentTarget as Element).setPointerCapture(e.pointerId); moveTo(e); }} onPointerMove={(e) => drag && moveTo(e)} onPointerUp={() => setDrag(false)} viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full touch-none select-none ${drag ? "cursor-grabbing" : "cursor-crosshair"}`} role="img" aria-label="Oxygen versus pressure envelope of PSI investigations">
            <defs>
              <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,95,58,0.35)" strokeWidth="2" />
              </pattern>
            </defs>
            {/* grid */}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line x1={xs(t)} x2={xs(t)} y1={M.t} y2={M.t + ih} stroke="rgba(148,178,255,0.08)" />
                <text x={xs(t)} y={H - M.b + 20} fill="#6b7896" fontSize="12" textAnchor="middle" fontFamily="var(--font-jb)">
                  {t}%
                </text>
              </g>
            ))}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.l} x2={W - M.r} y1={ys(t)} y2={ys(t)} stroke="rgba(148,178,255,0.08)" />
                <text x={M.l - 10} y={ys(t) + 4} fill="#6b7896" fontSize="12" textAnchor="end" fontFamily="var(--font-jb)">
                  {t}
                </text>
              </g>
            ))}
            <text x={M.l + iw / 2} y={H - 10} fill="#a7b3cf" fontSize="13" textAnchor="middle">
              Oxygen concentration (vol %)
            </text>
            <text x={16} y={M.t + ih / 2} fill="#a7b3cf" fontSize="13" textAnchor="middle" transform={`rotate(-90 16 ${M.t + ih / 2})`}>
              Pressure (kPa)
            </text>

            {/* Exploration atmosphere zone */}
            <rect x={xs(26.5)} y={ys(72)} width={xs(36) - xs(26.5)} height={ys(50) - ys(72)} fill="url(#hatch)" stroke="rgba(255,95,58,0.7)" strokeDasharray="4 4" rx="6" />
            <text x={xs(26.5) + 6} y={ys(50) + 16} fill="#ff8a6a" fontSize="11" fontFamily="var(--font-jb)">
              EXPLORATION ATMOSPHERE ZONE
            </text>

            {/* investigation boxes */}
            {rects.map(({ i, x0, x1, y0, y1 }, k) => {
              const col = FUEL_META[i.fuelType].color;
              const active = hover === i.id;
              return (
                <motion.rect
                  key={i.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: k * 0.03 }}
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  rx={4}
                  fill={col}
                  fillOpacity={hover ? (active ? 0.45 : 0.06) : 0.14}
                  stroke={col}
                  strokeOpacity={hover ? (active ? 1 : 0.25) : 0.7}
                  strokeWidth={active ? 2 : 1}
                  style={{ cursor: "pointer", transformOrigin: `${(x0 + x1) / 2}px ${(y0 + y1) / 2}px` }}
                  onMouseEnter={() => setHover(i.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onOpen(i.id)}
                />
              );
            })}

            {/* habitat markers */}
            {missions.map((m) => (
              <g key={m.id} transform={`translate(${xs(m.o2)},${ys(m.pressure)})`} pointerEvents="none">
                <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)" fill="#04060b" stroke="#e8eefc" strokeWidth="1.5" />
                <text x={10} y={m.id === "mars" || m.id === "earth" ? 18 : -8} fill="#e8eefc" fontSize="11" fontWeight={600}>
                  {m.id === "suit" ? "Suit" : m.short}
                </text>
              </g>
            ))}

            {/* current conditions crosshair */}
            <motion.g animate={{ x: xs(Math.min(100, cond.o2)), y: ys(Math.max(20, Math.min(310, cond.pressure))) }} transition={{ type: "spring", stiffness: 140, damping: 18 }} pointerEvents="none">
              <line x1={-2000} x2={2000} y1={0} y2={0} stroke="rgba(92,200,255,0.35)" strokeDasharray="3 5" />
              <line y1={-2000} y2={2000} x1={0} x2={0} stroke="rgba(92,200,255,0.35)" strokeDasharray="3 5" />
              <circle r={16} fill="none" stroke="#5cc8ff" strokeOpacity={0.4}>
                <animate attributeName="r" values="8;22;8" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle r={6} fill="#5cc8ff" />
            </motion.g>
            <rect x={M.l} y={M.t} width={iw} height={ih} fill="none" stroke="rgba(255,255,255,0.15)" pointerEvents="none" />
          </svg>

          {hov && (
            <div className="pointer-events-none absolute right-3 top-3 w-64 rounded-2xl border border-line-2 bg-[#0a1020]/95 p-4 text-xs shadow-2xl backdrop-blur sm:right-6 sm:top-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FUEL_META[hov.fuelType].color }} />
                <span className="font-semibold text-ink">{hov.acronym}</span>
                <span className="text-ink-3">{hov.years}</span>
              </div>
              <div className="mt-1 text-ink-2">{hov.name}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[0.7rem]">
                <div>
                  <div className="text-ink-3">O₂</div>
                  {hov.o2[0]}–{hov.o2[1]}%
                </div>
                <div>
                  <div className="text-ink-3">kPa</div>
                  {hov.pressure[0]}–{hov.pressure[1]}
                </div>
                <div>
                  <div className="text-ink-3">cm/s</div>
                  {hov.flow[0]}–{hov.flow[1]}
                </div>
              </div>
              <div className="mt-3 text-ink-3">{hov.habitatNote}</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="label">At {cond.o2}% O₂ · {cond.pressure} kPa:</span>
          {inside.length ? inside.map((i) => (
            <button key={i.id} onClick={() => onOpen(i.id)} className="rounded-sm border px-2 py-0.5 font-mono text-[11px] text-white" style={{ borderColor: FUEL_META[i.fuelType].color }}>{i.acronym}</button>
          )) : <span className="font-mono text-[11px] text-ember">⚠ No microgravity investigation tested here</span>}
        </div>
        <div className="mt-4 grid gap-3 text-xs text-ink-3 sm:grid-cols-3">
          <div>◆ Habitat atmospheres (NASA exploration-atmosphere planning values)</div>
          <div>● Your Mission Console conditions</div>
          <div>Ranges are envelopes summarised from PSI/NASA descriptions; see Methodology.</div>
        </div>
      </div>
    </Section>
  );
}
