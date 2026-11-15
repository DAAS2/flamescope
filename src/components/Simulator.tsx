"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, CircleDot, Cloud, Droplet, Flame, FlaskConical, RotateCcw, Sparkles, Wind, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Investigation } from "@/data/investigations";
import { type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { Btn, CatChip, Section, Seg, Slider } from "./ui";

export type SimKind = "spread" | "droplet" | "sphere" | "jet" | "smoke";

export function simKind(i: Investigation): SimKind {
  if (i.fuelType === "solid") return "spread";
  if (i.fuelType === "liquid") return "droplet";
  if (i.fuelType === "aerosol") return "smoke";
  if (/spherical|porous/i.test(i.sampleGeometry)) return "sphere";
  return "jet";
}

export const KIND_LABEL: Record<SimKind, string> = {
  spread: "Flame spread over a solid sample",
  droplet: "Free-floating fuel droplet combustion",
  sphere: "Spherical porous-burner flame",
  jet: "Laminar co-flow jet flame",
  smoke: "Smoke / aerosol transport to detectors",
};

export interface P extends Conditions {
  efield: number;
}

/** Heuristic physics. Illustrative trends drawn from PSI findings, not validated models. */
export function model(kind: SimKind, p: P) {
  const o2x = p.o2 / 21;
  const g = p.gravity + p.efield * 0.6; // E-FIELD ionic wind mimics buoyancy
  switch (kind) {
    case "spread": {
      const loi = 15.5 - Math.min(3, p.flow * 0.15); // flow helps oxygen supply up to a point
      const flowFactor = p.flow < 1 ? 0.25 : Math.exp(-Math.pow((p.flow - 18) / 22, 2)) * 1.1 + 0.15; // BASS-II: optimum flow
      const alive = p.o2 > loi && (p.flow > 0.5 || g > 0.05 || p.o2 > 24);
      const rate = alive ? Math.max(0, (p.o2 - loi) / 6) * flowFactor * (1 + g * 1.5) * Math.pow(p.pressure / 101, 0.3) : 0;
      return { alive, rate, readouts: [["Spread rate", `${(rate * 2.2).toFixed(2)} mm/s`], ["Est. limiting O₂", `${loi.toFixed(1)}%`], ["Status", alive ? "Burning" : "Extinguished"]] };
    }
    case "droplet": {
      const K = 0.35 * Math.log(1 + 2.2 * o2x) * (1 + g * 0.4); // mm²/s, d²-law burning constant
      const hotExt = p.o2 < 14 || p.pressure < 40;
      return { alive: !hotExt, rate: K, readouts: [["Burning constant K", `${K.toFixed(2)} mm²/s`], ["Flame / droplet", `${(g > 0.1 ? 3 : 7).toFixed(0)}× d`], ["Regime", hotExt ? "Cool flame" : "Hot flame"]] };
    }
    case "sphere": {
      const r = 0.6 + 0.5 * o2x;
      return { alive: p.o2 > 13, rate: r, readouts: [["Flame radius", `${(r * 18).toFixed(0)} mm`], ["Soot", p.o2 > 30 ? "Low" : "Moderate"], ["Shape", g > 0.1 ? "Distorted" : "Spherical"]] };
    }
    case "jet": {
      const L = 40 * (1 / Math.sqrt(o2x)) * (1 + 0.4 * (1 - Math.min(1, g)));
      return { alive: p.o2 > 13, rate: L, readouts: [["Flame length", `${L.toFixed(0)} mm`], ["Lift-off", p.flow > 35 ? "Lifted" : "Attached"], ["Buoyancy", g > 0.05 ? (p.efield ? "E-field proxy" : "Present") : "None"]] };
    }
    case "smoke": {
      const size = 0.4 + (g < 0.05 ? 0.6 : 0.2) + (p.flow < 3 ? 0.3 : 0); // µm, aging without settling
      return { alive: true, rate: size, readouts: [["Mean particle size", `${size.toFixed(2)} µm`], ["Photoelectric", size > 0.8 ? "Strong" : "Weak"], ["Ionization", size > 0.8 ? "Weak" : "Strong"]] };
    }
  }
}

export function SimCanvas({ kind, params, seed }: { kind: SimKind; params: P; seed: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const pr = useRef(params);
  pr.current = params;

  useEffect(() => {
    const c = cv.current!;
    const ctx = c.getContext("2d")!;
    let W = 0,
      H = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => {
      const r = c.getBoundingClientRect();
      W = r.width;
      H = r.height;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    let t = 0;
    let front = 0.08; // spread
    let d2 = 1; // droplet d²
    let phase = 0;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; s: number }[] = [];
    let raf = 0;
    let last = performance.now();

    const glow = (x: number, y: number, r: number, c0: string, a = 1) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c0.replace("A", String(a)));
      g.addColorStop(1, c0.replace("A", "0"));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const p = pr.current;
      const m = model(kind, p);
      const g = p.gravity + p.efield * 0.6;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const hot = g > 0.15;
      const flameCol = hot ? "rgba(255,150,50,A)" : "rgba(80,170,255,A)";

      // airflow streaks
      if (p.flow > 0 && kind !== "droplet") {
        ctx.strokeStyle = "rgba(160,200,255,0.10)";
        for (let i = 0; i < 14; i++) {
          const y = ((i * 53) % H) + 6;
          const x = ((t * p.flow * 6 + i * 97) % (W + 80)) - 80;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 40, y);
          ctx.stroke();
        }
      }

      if (kind === "spread") {
        const sy = H * 0.58,
          x0 = W * 0.08,
          x1 = W * 0.92;
        if (m.alive) front = Math.min(1, front + m.rate * dt * 0.035);
        if (front >= 1) { phase += dt; if (phase > 1.6) { front = 0.08; phase = 0; } }
        const fx = x0 + (x1 - x0) * front;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.strokeRect(x0 - 6, sy - 10, x1 - x0 + 12, 20); // sample holder
        ctx.fillStyle = "#d8c49a"; // fabric/PMMA
        ctx.fillRect(fx, sy - 4, x1 - fx, 8);
        const cg = ctx.createLinearGradient(x0, 0, fx, 0);
        cg.addColorStop(0, "#2a2420"); cg.addColorStop(1, "#5a3a22");
        ctx.fillStyle = cg; // char
        ctx.fillRect(x0, sy - 4, Math.max(0, fx - x0), 8);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "500 12px var(--font-public), sans-serif";
        ctx.fillText("Airflow →", x0, sy + 30);
        ctx.fillText(`${Math.round(front * 100)}% burned`, x1 - 70, sy + 30);
        ctx.globalCompositeOperation = "lighter";
        if (m.alive && front < 1) {
          const len = 30 + m.rate * 30;
          for (let i = 0; i < 6; i++) {
            const lean = p.flow * 1.2;
            glow(fx + lean * 0.6 + Math.sin(t * 7 + i) * 2, sy - (hot ? len * 0.5 : 6) - i * (hot ? 6 : 1), (hot ? 14 : 22) + i * 2, flameCol, 0.35);
          }
          if (Math.random() < 0.6) parts.push({ x: fx, y: sy - 8, vx: p.flow * 2 + (Math.random() - 0.5) * 10, vy: -g * 60 - Math.random() * 6, life: 1, s: 1.4 });
        }
        if (front >= 1 || !m.alive) {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "500 12px var(--font-public), sans-serif";
          ctx.fillText(front >= 1 ? "Sample consumed, re-igniting…" : "No sustained flame at these conditions", 16, 68);
        }
      } else if (kind === "droplet") {
        const cx = W / 2,
          cy = H / 2 - (hot ? 20 : 0);
        d2 = Math.max(0, d2 - m.rate * dt * 0.05);
        if (d2 <= 0) {
          phase += dt;
          if (phase > 1.5) {
            d2 = 1;
            phase = 0;
          }
        }
        const d = Math.sqrt(d2) * 14;
        const cool = !m.alive;
        if (d > 0.5) {
          const fr = d * (hot ? 3 : 6);
          if (hot) {
            for (let i = 0; i < 5; i++) glow(cx, cy - fr * 0.5 - i * 8, fr * (1 - i * 0.12), flameCol, 0.25);
          } else {
            ctx.strokeStyle = cool ? "rgba(140,200,255,0.25)" : "rgba(90,180,255,0.9)";
            ctx.lineWidth = cool ? 1 : 3;
            ctx.shadowColor = "rgba(90,180,255,0.9)";
            ctx.shadowBlur = cool ? 6 : 24;
            ctx.beginPath();
            ctx.arc(cx, cy, fr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            glow(cx, cy, fr * 1.25, cool ? "rgba(120,170,255,A)" : "rgba(60,140,255,A)", cool ? 0.08 : 0.18);
          }
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#e9f2ff";
          ctx.beginPath();
          ctx.arc(cx, cy, d, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "500 12px var(--font-public), sans-serif";
        ctx.fillText(`d² = ${(d2 * 100).toFixed(0)}% of d₀²   ${cool ? "· cool-flame regime (nearly invisible)" : ""}`, 16, 68);
      } else if (kind === "sphere") {
        const cx = W / 2,
          cy = H / 2;
        const r = 26 + m.rate * 34 + Math.sin(t * 2) * 1.5;
        if (m.alive) {
          for (let i = 0; i < 4; i++) {
            const oy = hot ? -i * 10 : 0;
            glow(cx, cy + oy, r * (1.2 - i * 0.08), flameCol, hot ? 0.3 : 0.22);
          }
          ctx.strokeStyle = hot ? "rgba(255,190,90,0.8)" : "rgba(110,190,255,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy - (hot ? r * 0.3 : 0), r, r * (hot ? 1.4 : 1), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#3a3f4a";
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 3, cy + 14, 6, H);
      } else if (kind === "jet") {
        const nx = W / 2,
          ny = H * 0.85;
        const L = m.rate * 2.2;
        const wid = hot ? 10 : 18;
        const lift = p.flow > 35 ? 18 : 0;
        if (m.alive) {
          for (let i = 0; i < 10; i++) {
            const k = i / 10;
            glow(nx + Math.sin(t * 6 + i) * (hot ? 2 : 0.5), ny - lift - k * L, wid * (1 - k * 0.6) + 4, i < 2 ? "rgba(80,140,255,A)" : flameCol, 0.22);
          }
          if (p.o2 < 22 && !hot) glow(nx, ny - lift - L * 0.95, 10, "rgba(255,120,40,A)", 0.35); // soot tip
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#596273";
        ctx.fillRect(nx - 4, ny, 8, H - ny);
        if (p.efield > 0) {
          ctx.strokeStyle = "rgba(164,139,255,0.5)";
          ctx.setLineDash([4, 6]);
          ctx.strokeRect(nx - 70, ny - L - 40, 140, 6);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(164,139,255,0.8)";
          ctx.font = "500 12px var(--font-public), sans-serif";
          ctx.fillText(`Electrode · ${(p.efield * 10).toFixed(1)} kV`, nx - 70, ny - L - 48);
        }
      } else {
        // smoke
        const sx = W * 0.15,
          sy = H * 0.6;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#ff6a3a";
        ctx.fillRect(sx - 12, sy, 24, 6);
        if (Math.random() < 0.9) parts.push({ x: sx, y: sy - 2, vx: 6 + p.flow * 3 + (Math.random() - 0.5) * 8, vy: -g * 25 + (Math.random() - 0.5) * 8, life: 1, s: 1 + Math.random() });
        // detector
        ctx.strokeStyle = "rgba(164,139,255,0.7)";
        ctx.strokeRect(W * 0.78, H * 0.3, 60, 60);
        ctx.fillStyle = "rgba(164,139,255,0.8)";
        ctx.font = "500 12px var(--font-public), sans-serif";
        ctx.fillText("Smoke detector", W * 0.78, H * 0.3 - 6);
      }

      // particles (soot/smoke)
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy -= g * 20 * dt;
        q.life -= dt * (kind === "smoke" ? 0.12 : 0.6);
        if (kind === "smoke") q.s += dt * (g < 0.05 ? 0.6 : 0.15); // aging → growth
        if (q.life <= 0 || q.x > W + 10 || q.y < -10) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = kind === "smoke" ? `rgba(200,200,215,${q.life * 0.35})` : `rgba(255,170,90,${q.life * 0.5})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [kind, seed]);

  return <canvas ref={cv} className="h-full w-full" aria-label={KIND_LABEL[kind]} />;
}


const KINDS: { id: SimKind; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "spread", label: "Solid materials", hint: "Flame spread", icon: Flame },
  { id: "droplet", label: "Fuel droplets", hint: "d²-law burning", icon: Droplet },
  { id: "sphere", label: "Spherical flames", hint: "Porous burner", icon: CircleDot },
  { id: "jet", label: "Gas jets", hint: "Co-flow flames", icon: Wind },
  { id: "smoke", label: "Smoke", hint: "Detection", icon: Cloud },
];

export const testedSetup = (i: Investigation): P => ({ o2: i.o2[1], pressure: i.pressure[0], flow: Math.round((i.flow[0] + i.flow[1]) / 2), gravity: 0, efield: 0 });

export default function Simulator({ investigations, cond, label, onOpen }: { investigations: Investigation[]; cond: Conditions; label: string; onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<SimKind>("spread");
  const group = useMemo(() => investigations.filter((i) => simKind(i) === kind), [investigations, kind]);
  const [sel, setSel] = useState("bass-ii");
  const inv = group.find((i) => i.id === sel) ?? group[0];
  const [seed, setSeed] = useState(0);
  const [p, setP] = useState<P>(() => {
    const b = investigations.find((i) => i.id === "bass-ii");
    return b ? testedSetup(b) : { ...cond, efield: 0 };
  });
  const ai = useAI();
  const { setText } = ai;

  const select = (i: Investigation) => {
    setSel(i.id);
    setP(testedSetup(i));
    setSeed((x) => x + 1);
    setText("");
  };
  const chooseKind = (k: SimKind) => {
    setKind(k);
    const first = investigations.find((i) => simKind(i) === k);
    if (first) select(first);
  };

  if (!inv) return null;
  const m = model(kind, p);
  const outside =
    p.o2 < inv.o2[0] - 0.01 || p.o2 > inv.o2[1] + 0.01 || p.pressure < inv.pressure[0] - 1 || p.pressure > inv.pressure[1] + 1 || p.flow < inv.flow[0] - 0.01 || p.flow > inv.flow[1] + 0.01 || p.gravity > 0.001;

  return (
    <Section
      id="simulator"
      eyebrow="Experiment simulator"
      title={
        <>
          Re-fly NASA&apos;s experiments, <span className="text-blue">then push past them.</span>
        </>
      }
      intro="Pick an experiment and it runs live at the conditions NASA tested. The green band on each slider is what was actually flown. Move outside it and you have left the data."
    >
      <div className="panel overflow-hidden p-2 sm:p-3">
        {/* window chrome */}
        <div className="flex items-center gap-3 px-3 pb-3 pt-1.5">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto hidden rounded-full bg-paper px-4 py-1 text-[0.78rem] text-ink-3 sm:block">flamescope / simulator / {inv.acronym.toLowerCase()}</span>
          <span className="w-[54px]" />
        </div>
        <div className="rounded-[24px] bg-paper p-2 sm:p-3">
          <Seg id="simkind" items={KINDS} value={kind} onChange={chooseKind} />
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_360px]">
          {/* Stage */}
          <div className="relative min-h-[440px] overflow-hidden rounded-[24px] bg-night sm:min-h-[540px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(31,92,255,0.16),transparent_65%)]" />
            <div className="absolute inset-0">
              <SimCanvas kind={kind} params={p} seed={seed} />
            </div>
            <div className="no-scrollbar absolute inset-x-0 top-0 flex gap-1.5 overflow-x-auto p-3 pr-28">
              {group.map((g) => (
                <button
                  key={g.id}
                  onClick={() => select(g)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold transition ${g.id === inv.id ? "bg-white text-ink" : "bg-white/8 text-snow-2 ring-1 ring-white/10 hover:bg-white/15"}`}
                >
                  {g.acronym}
                </button>
              ))}
            </div>
            <div className="absolute right-3 top-3">
              <motion.span
                key={String(m.alive)}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem] font-semibold ${m.alive ? "bg-go/15 text-[#5fe3b4]" : "bg-flame/15 text-flame"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${m.alive ? "animate-pulse bg-[#5fe3b4]" : "bg-flame"}`} />
                {m.alive ? "Burning" : "Out"}
              </motion.span>
            </div>
            <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
              <AnimatePresence>
                {outside && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="frost inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[0.82rem] text-[#ffd2bf]">
                    <AlertTriangle size={15} className="text-flame" />
                    Extrapolating beyond what {inv.acronym} tested
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="grid grid-cols-3 gap-2">
                {m.readouts.map(([k, v]) => (
                  <div key={k} className="frost rounded-2xl px-3 py-2.5 text-snow">
                    <div className="truncate text-[0.72rem] text-snow-3">{k}</div>
                    <div className={`tnum truncate text-[0.95rem] font-semibold ${/Extinguished|Cool/.test(v) ? "text-flame" : ""}`}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col rounded-[24px] bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.8rem] text-ink-3">{KIND_LABEL[kind]}</div>
                <h3 className="text-[1.6rem] font-semibold leading-tight">{inv.acronym}</h3>
                <p className="text-[0.85rem] text-ink-2">{inv.name}</p>
              </div>
              <button
                onClick={() => onOpen(inv.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line transition hover:bg-ink hover:text-white"
                aria-label={`Open ${inv.acronym} details`}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {inv.categories.map((c) => (
                <CatChip key={c} c={c} />
              ))}
            </div>

            <div className="mt-6 space-y-6">
              <Slider label="Oxygen" unit="%" value={p.o2} min={10} max={100} step={0.5} band={inv.o2} onChange={(v) => setP({ ...p, o2: v })} />
              <Slider label="Pressure" unit=" kPa" value={p.pressure} min={20} max={300} step={1} band={inv.pressure} onChange={(v) => setP({ ...p, pressure: v })} />
              <Slider label="Airflow" unit=" cm/s" value={p.flow} min={0} max={50} step={1} band={inv.flow} onChange={(v) => setP({ ...p, flow: v })} />
              <Slider label="Gravity" unit=" g" value={p.gravity} min={0} max={1} step={0.01} band={[0, 0]} onChange={(v) => setP({ ...p, gravity: v })} />
              {inv.id === "e-field" && <Slider label="Electric field" unit="" value={p.efield} min={0} max={1} step={0.05} band={[0, 1]} onChange={(v) => setP({ ...p, efield: v })} />}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  setP(testedSetup(inv));
                  setSeed((x) => x + 1);
                }}
              >
                <FlaskConical size={14} /> Tested setup
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  setP({ ...cond, efield: 0 });
                  setSeed((x) => x + 1);
                }}
              >
                My mission
              </Btn>
              <Btn variant="ink" size="sm" className="col-span-2" onClick={() => setSeed((x) => x + 1)}>
                <RotateCcw size={14} /> Re-ignite
              </Btn>
            </div>
            <div className="mt-auto pt-5">
              <Btn variant="blue" className="w-full" disabled={ai.loading} onClick={() => ai.run({ mode: "interpret", ids: [inv.id], conditions: { ...p, label } })}>
                <Sparkles size={15} /> {ai.loading ? "Interpreting…" : "What does this mean for a crew?"}
              </Btn>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {ai.text && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-2 rounded-[24px] bg-paper p-6">
                <div className="mb-2 flex items-center gap-2 text-[0.85rem] font-semibold text-blue">
                  <Sparkles size={15} /> {inv.acronym} at {p.o2}% O₂, {p.pressure} kPa, {p.gravity} g
                </div>
                <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-4 text-[0.8rem] text-ink-3">The simulations show the qualitative trends each investigation reported. They are heuristic models, not validated CFD.</p>
    </Section>
  );
}
