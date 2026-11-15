"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Hand } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FuelType, Investigation } from "@/data/investigations";
import { missions } from "@/lib/missions";
import type { Conditions } from "@/lib/scoring";
import { FUEL_META } from "./ui";

const W = 900,
  H = 500,
  M = { l: 58, r: 16, t: 16, b: 50 };
const iw = W - M.l - M.r,
  ih = H - M.t - M.b;

// Piecewise O₂ axis so 10–50% (where most data lives) gets 78% of the width.
const xs = (o2: number) => (o2 <= 50 ? ((o2 - 10) / 40) * 0.78 * iw : 0.78 * iw + ((o2 - 50) / 50) * 0.22 * iw) + M.l;
const ys = (p: number) => M.t + ih - ((p - 20) / 290) * ih;
const ixs = (x: number) => {
  const t = (x - M.l) / iw;
  return t <= 0.78 ? 10 + (t / 0.78) * 40 : 50 + ((t - 0.78) / 0.22) * 50;
};
const iys = (y: number) => 20 + ((M.t + ih - y) / ih) * 290;

export default function Envelope({ investigations, cond, onOpen, setCond }: { investigations: Investigation[]; cond: Conditions; onOpen: (id: string) => void; setCond?: (c: Conditions) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<FuelType>>(new Set());
  const moveTo = (e: React.PointerEvent) => {
    if (!setCond || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const v = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    const o2 = Math.round(Math.min(100, Math.max(10, ixs(v.x))));
    const pr = Math.round(Math.min(310, Math.max(20, iys(v.y))) * 10) / 10;
    setCond({ ...cond, o2, pressure: pr });
  };
  const inside = investigations.filter((i) => cond.o2 >= i.o2[0] - 1 && cond.o2 <= i.o2[1] + 1 && cond.pressure >= i.pressure[0] - 6 && cond.pressure <= i.pressure[1] + 6);
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
          const minW = 12;
          const j = ((idx * 37) % 9) - 4;
          if (x1 - x0 < minW) {
            const c = (x0 + x1) / 2 + j * 2.4;
            x0 = c - minW / 2;
            x1 = c + minW / 2;
          }
          if (y1 - y0 < minW) {
            const c = (y0 + y1) / 2 + j * 2.4;
            y0 = c - minW / 2;
            y1 = c + minW / 2;
          }
          return { i, x0, x1, y0, y1 };
        })
        .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0)),
    [investigations, hidden],
  );

  const xTicks = [10, 21, 30, 40, 50, 70, 100];
  const yTicks = [30, 70, 101, 150, 200, 250, 300];

  return (
    <div>
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
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8rem] font-medium ring-1 transition ${hidden.has(f) ? "text-ink-3 opacity-50 ring-line" : "bg-white text-ink ring-line-2"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_META[f].color }} />
            {FUEL_META[f].label}
          </button>
        ))}
        {setCond && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-3 py-1.5 text-[0.8rem] font-medium text-blue">
            <Hand size={14} /> Drag on the map to move your mission
          </span>
        )}
      </div>

      <div className="relative w-full rounded-3xl bg-paper p-2 sm:p-4">
        <svg
          ref={svgRef}
          onPointerDown={(e) => {
            if ((e.target as Element).getAttribute("data-box")) return;
            setDrag(true);
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            moveTo(e);
          }}
          onPointerMove={(e) => drag && moveTo(e)}
          onPointerUp={() => setDrag(false)}
          viewBox={`0 0 ${W} ${H}`}
          className={`h-auto w-full touch-none select-none ${drag ? "cursor-grabbing" : "cursor-crosshair"}`}
          role="img"
          aria-label="Oxygen versus pressure map of tested conditions"
        >
          <rect x={M.l} y={M.t} width={iw} height={ih} rx={14} fill="#fff" />
          {xTicks.map((t) => (
            <text key={`x${t}`} x={xs(t)} y={H - M.b + 22} fill="#8a91a5" fontSize="13" textAnchor="middle">
              {t}%
            </text>
          ))}
          {yTicks.map((t) => (
            <text key={`y${t}`} x={M.l - 10} y={ys(t) + 4} fill="#8a91a5" fontSize="13" textAnchor="end">
              {t}
            </text>
          ))}
          <text x={M.l + iw / 2} y={H - 6} fill="#4a5268" fontSize="13" fontWeight={600} textAnchor="middle">
            Oxygen (%)
          </text>
          <text x={14} y={M.t + ih / 2} fill="#4a5268" fontSize="13" fontWeight={600} textAnchor="middle" transform={`rotate(-90 14 ${M.t + ih / 2})`}>
            Pressure (kPa)
          </text>

          {/* Exploration atmosphere zone */}
          <rect x={xs(26.5)} y={ys(72)} width={xs(36) - xs(26.5)} height={ys(50) - ys(72)} fill="rgba(255,106,43,0.08)" stroke="#ff6a2b" strokeDasharray="5 5" rx="10" />
          <text x={xs(26.5) + 8} y={ys(50) + 18} fill="#e8590c" fontSize="12" fontWeight={600}>
            Exploration atmospheres
          </text>

          {rects.map(({ i, x0, x1, y0, y1 }, k) => {
            const col = FUEL_META[i.fuelType].color;
            const active = hover === i.id;
            return (
              <motion.rect
                key={i.id}
                data-box="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: k * 0.03 }}
                x={x0}
                y={y0}
                width={x1 - x0}
                height={y1 - y0}
                rx={5}
                fill={col}
                fillOpacity={hover ? (active ? 0.4 : 0.05) : 0.16}
                stroke={col}
                strokeOpacity={hover ? (active ? 1 : 0.2) : 0.75}
                strokeWidth={active ? 2.2 : 1.2}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onOpen(i.id)}
              />
            );
          })}

          {missions.map((m) => (
            <g key={m.id} transform={`translate(${xs(m.o2)},${ys(m.pressure)})`} pointerEvents="none">
              <circle r={5} fill="#0b0f1d" stroke="#fff" strokeWidth="2" />
              <text x={9} y={m.id === "mars" || m.id === "earth" ? 18 : -8} fill="#0b0f1d" fontSize="12" fontWeight={600}>
                {m.id === "suit" ? "Suit" : m.short}
              </text>
            </g>
          ))}

          <motion.g animate={{ x: xs(Math.min(100, cond.o2)), y: ys(Math.max(20, Math.min(310, cond.pressure))) }} transition={{ type: "spring", stiffness: 160, damping: 20 }} pointerEvents="none">
            <line x1={-2000} x2={2000} y1={0} y2={0} stroke="rgba(31,92,255,0.3)" strokeDasharray="4 6" />
            <line y1={-2000} y2={2000} x1={0} x2={0} stroke="rgba(31,92,255,0.3)" strokeDasharray="4 6" />
            <circle r={16} fill="none" stroke="#1f5cff" strokeOpacity={0.5}>
              <animate attributeName="r" values="9;24;9" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r={8} fill="#1f5cff" stroke="#fff" strokeWidth="3" />
          </motion.g>
        </svg>

        {hov && (
          <div className="pointer-events-none absolute right-4 top-4 w-64 rounded-3xl bg-white p-4 text-[0.82rem] shadow-xl ring-1 ring-line sm:right-6 sm:top-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_META[hov.fuelType].color }} />
              <span className="font-semibold text-ink">{hov.acronym}</span>
              <span className="text-ink-3">{hov.years}</span>
            </div>
            <div className="mt-1 text-ink-2">{hov.name}</div>
            <div className="tnum mt-3 grid grid-cols-3 gap-2">
              {[
                ["O₂ %", `${hov.o2[0]}–${hov.o2[1]}`],
                ["kPa", `${hov.pressure[0]}–${hov.pressure[1]}`],
                ["cm/s", `${hov.flow[0]}–${hov.flow[1]}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[0.7rem] text-ink-3">{k}</div>
                  <div className="font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[0.85rem] font-medium text-ink-2">
          Tested at {cond.o2}% O₂ and {cond.pressure} kPa:
        </span>
        {inside.length ? (
          inside.map((i) => (
            <button key={i.id} onClick={() => onOpen(i.id)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.8rem] font-semibold ring-1 ring-line hover:ring-ink">
              <span className="h-2 w-2 rounded-full" style={{ background: FUEL_META[i.fuelType].color }} />
              {i.acronym}
            </button>
          ))
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-flame-soft px-3 py-1 text-[0.8rem] font-semibold text-warn">
            <AlertTriangle size={14} /> No microgravity experiment covers this point
          </span>
        )}
      </div>
    </div>
  );
}
