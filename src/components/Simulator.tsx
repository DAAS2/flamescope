"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Investigation, SafetyCategory } from "@/data/investigations";
import { rank, type Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { CAT_META, CatChip, FUEL_META, Section } from "./ui";

type SimKind = "spread" | "droplet" | "sphere" | "jet" | "smoke";

export function simKind(i: Investigation): SimKind {
  if (i.fuelType === "solid") return "spread";
  if (i.fuelType === "liquid") return "droplet";
  if (i.fuelType === "aerosol") return "smoke";
  if (/spherical|porous/i.test(i.sampleGeometry)) return "sphere";
  return "jet";
}

const KIND_LABEL: Record<SimKind, string> = {
  spread: "Flame spread over a solid sample",
  droplet: "Free-floating fuel droplet combustion",
  sphere: "Spherical porous-burner flame",
  jet: "Laminar co-flow jet flame",
  smoke: "Smoke / aerosol transport to detectors",
};

interface P extends Conditions {
  efield: number;
}

/** Heuristic physics. Illustrative trends drawn from PSI findings, not validated models. */
function model(kind: SimKind, p: P) {
  const o2x = p.o2 / 21;
  const g = p.gravity + p.efield * 0.6; // E-FIELD ionic wind mimics buoyancy
  switch (kind) {
    case "spread": {
      const loi = 15.5 - Math.min(3, p.flow * 0.15); // flow helps oxygen supply up to a point
      const flowFactor = p.flow < 1 ? 0.25 : Math.exp(-Math.pow((p.flow - 18) / 22, 2)) * 1.1 + 0.15; // BASS-II: optimum flow
      const alive = p.o2 > loi && (p.flow > 0.5 || g > 0.05 || p.o2 > 24);
      const rate = alive ? Math.max(0, (p.o2 - loi) / 6) * flowFactor * (1 + g * 1.5) * Math.pow(p.pressure / 101, 0.3) : 0;
      return { alive, rate, readouts: [["Spread rate", `${(rate * 2.2).toFixed(2)} mm/s`], ["Est. limiting O₂", `${loi.toFixed(1)}%`], ["Status", alive ? "BURNING" : "EXTINGUISHED"]] };
    }
    case "droplet": {
      const K = 0.35 * Math.log(1 + 2.2 * o2x) * (1 + g * 0.4); // mm²/s, d²-law burning constant
      const hotExt = p.o2 < 14 || p.pressure < 40;
      return { alive: !hotExt, rate: K, readouts: [["Burning constant K", `${K.toFixed(2)} mm²/s`], ["Flame / droplet", `${(g > 0.1 ? 3 : 7).toFixed(0)}× d`], ["Regime", hotExt ? "COOL FLAME" : "HOT FLAME"]] };
    }
    case "sphere": {
      const r = 0.6 + 0.5 * o2x;
      return { alive: p.o2 > 13, rate: r, readouts: [["Flame radius", `${(r * 18).toFixed(0)} mm`], ["Soot", p.o2 > 30 ? "LOW" : "MODERATE"], ["Shape", g > 0.1 ? "DISTORTED" : "SPHERICAL"]] };
    }
    case "jet": {
      const L = 40 * (1 / Math.sqrt(o2x)) * (1 + 0.4 * (1 - Math.min(1, g)));
      return { alive: p.o2 > 13, rate: L, readouts: [["Flame length", `${L.toFixed(0)} mm`], ["Lift-off", p.flow > 35 ? "LIFTED" : "ATTACHED"], ["Buoyancy", g > 0.05 ? (p.efield ? "E-FIELD PROXY" : "PRESENT") : "NONE"]] };
    }
    case "smoke": {
      const size = 0.4 + (g < 0.05 ? 0.6 : 0.2) + (p.flow < 3 ? 0.3 : 0); // µm, aging without settling
      return { alive: true, rate: size, readouts: [["Mean particle size", `${size.toFixed(2)} µm`], ["Photoelectric", size > 0.8 ? "STRONG" : "WEAK"], ["Ionization", size > 0.8 ? "WEAK" : "STRONG"]] };
    }
  }
}

function SimCanvas({ kind, params, seed }: { kind: SimKind; params: P; seed: number }) {
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
      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
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
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px var(--font-jb)";
        ctx.fillText("AIRFLOW →", x0, sy + 30);
        ctx.fillText(`BURNT ${Math.round(front * 100)}%`, x1 - 70, sy + 30);
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
          ctx.font = "11px var(--font-jb)";
          ctx.fillText(front >= 1 ? "SAMPLE CONSUMED · re-igniting…" : "NO SUSTAINED FLAME AT THESE CONDITIONS", 16, 24);
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
        ctx.font = "11px var(--font-jb)";
        ctx.fillText(`d² = ${(d2 * 100).toFixed(0)}% of d₀²   ${cool ? "· COOL-FLAME REGIME (near-invisible)" : ""}`, 16, 24);
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
          ctx.font = "10px var(--font-jb)";
          ctx.fillText(`E-FIELD ELECTRODE · ${(p.efield * 10).toFixed(1)} kV`, nx - 70, ny - L - 48);
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
        ctx.font = "10px var(--font-jb)";
        ctx.fillText("DETECTOR", W * 0.78, H * 0.3 - 6);
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

function RangeSlider({ label, unit, value, min, max, step, tested, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; tested?: [number, number]; onChange: (v: number) => void }) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const out = tested && (value < tested[0] - 0.01 || value > tested[1] + 0.01);
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className={`font-mono text-xs ${out ? "text-amber" : "text-white"}`}>
          {value}
          {unit}
        </span>
      </div>
      <div className="relative">
        {tested && (
          <div
            className="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border border-green/50 bg-green/15"
            style={{ left: `${pct(tested[0])}%`, width: `max(6px, ${pct(tested[1]) - pct(tested[0])}%)` }}
            title="Tested range"
          />
        )}
        <input type="range" className="slider relative w-full" min={min} max={max} step={step} value={value} style={{ ["--p" as string]: `${pct(value)}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      </div>
    </label>
  );
}

export default function Simulator({ investigations, cond, label, onOpen }: { investigations: Investigation[]; cond: Conditions; label: string; onOpen: (id: string) => void }) {
  const [sel, setSel] = useState(investigations[0]?.id ?? "bass-ii");
  const [cat, setCat] = useState<SafetyCategory | "all">("all");
  const [q, setQ] = useState("");
  const [seed, setSeed] = useState(0);
  const inv = investigations.find((i) => i.id === sel)!;
  const kind = simKind(inv);
  const [p, setP] = useState<P>({ ...cond, efield: 0 });
  const ai = useAI();

  const ranked = useMemo(() => rank(investigations, cond), [investigations, cond]);
  const list = ranked.filter((r) => (cat === "all" || r.inv.categories.includes(cat)) && (!q || `${r.inv.acronym} ${r.inv.name} ${r.inv.fuels.join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  const loadTested = (i: Investigation) => setP({ o2: i.o2[1], pressure: i.pressure[0], flow: Math.round((i.flow[0] + i.flow[1]) / 2), gravity: 0, efield: 0 });
  const select = (i: Investigation) => {
    setSel(i.id);
    loadTested(i);
    setSeed((s) => s + 1);
    ai.setText("");
  };
  useEffect(() => {
    setP({ ...cond, efield: 0 });
  }, [cond]);

  const m = model(kind, p);
  const outside = p.o2 < inv.o2[0] - 0.01 || p.o2 > inv.o2[1] + 0.01 || p.pressure < inv.pressure[0] - 1 || p.pressure > inv.pressure[1] + 1 || p.gravity > 0.001;

  return (
    <Section
      id="simulator"
      eyebrow="Experiment Simulator"
      title={
        <>
          Re-fly the experiments. <span className="text-gradient">Live.</span>
        </>
      }
      intro="Every PSI investigation runs as a live simulation. Push oxygen, pressure, airflow and gravity past what was tested and FlameScope flags exactly when you leave the data and start extrapolating."
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        {/* list */}
        <div className="glass hud flex max-h-[640px] flex-col">
          <div className="space-y-2 border-b border-line p-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search experiments…" className="w-full rounded border border-line bg-black/50 px-3 py-2 text-xs text-white placeholder:text-ink-3 focus:border-blue focus:outline-none" />
            <div className="flex flex-wrap gap-1">
              {(["all", "prevention", "detection", "suppression"] as const).map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${cat === c ? "border-white bg-white text-black" : "border-line text-ink-2 hover:text-white"}`}>
                  {c === "all" ? "All" : CAT_META[c].label}
                </button>
              ))}
            </div>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {list.map((r) => (
              <button key={r.inv.id} onClick={() => select(r.inv)} className={`flex w-full items-center gap-3 border-b border-line/60 px-3 py-2.5 text-left transition ${sel === r.inv.id ? "bg-blue/10" : "hover:bg-white/[0.03]"}`}>
                <span className="h-8 w-[3px] rounded-full" style={{ background: FUEL_META[r.inv.fuelType].color, opacity: sel === r.inv.id ? 1 : 0.5 }} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${sel === r.inv.id ? "text-blue" : "text-white"}`}>{r.inv.acronym}</span>
                  <span className="block truncate text-[11px] text-ink-3">{r.inv.name}</span>
                </span>
                <span className="font-mono text-[11px] text-ink-2">{r.score}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[10px] text-ink-3">Ranked for {label}</div>
        </div>

        {/* stage */}
        <div className="glass hud relative flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="label">{KIND_LABEL[kind]}</div>
              <div className="truncate font-display text-xl font-semibold uppercase tracking-wide text-white">
                {inv.acronym} <span className="text-sm font-normal normal-case text-ink-3">· {inv.platform}</span>
              </div>
            </div>
            <span className={`shrink-0 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${m.alive ? "border-green/40 text-green" : "border-ember/50 text-ember"}`}>{m.alive ? "● Live" : "○ Out"}</span>
          </div>
          <div className="relative flex-1">
            <SimCanvas kind={kind} params={p} seed={seed} />
            <AnimatePresence>
              {outside && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-3 top-3 max-w-[60%] rounded-sm border border-amber/50 bg-black/70 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber backdrop-blur">
                  ⚠ Extrapolating beyond {inv.acronym}&apos;s tested envelope
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
            {m.readouts.map(([k, v]) => (
              <div key={k} className="bg-black/80 px-3 py-2.5">
                <div className="text-[9px] uppercase tracking-widest text-white/40">{k}</div>
                <div className={`font-mono text-sm ${/EXTING|OUT|COOL/.test(v) ? "text-amber" : "text-white"}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="glass hud flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <span className="label">Test conditions</span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-green">
              <span className="h-2 w-3 rounded-sm border border-green/50 bg-green/15" /> tested
            </span>
          </div>
          <RangeSlider label="Oxygen" unit="%" value={p.o2} min={10} max={100} step={0.5} tested={inv.o2} onChange={(v) => setP({ ...p, o2: v })} />
          <RangeSlider label="Pressure" unit=" kPa" value={p.pressure} min={20} max={300} step={1} tested={inv.pressure} onChange={(v) => setP({ ...p, pressure: v })} />
          <RangeSlider label="Airflow" unit=" cm/s" value={p.flow} min={0} max={50} step={1} tested={inv.flow} onChange={(v) => setP({ ...p, flow: v })} />
          <RangeSlider label="Gravity" unit=" g" value={p.gravity} min={0} max={1} step={0.01} tested={[0, 0]} onChange={(v) => setP({ ...p, gravity: v })} />
          {inv.id === "e-field" && <RangeSlider label="Electric field" unit="" value={p.efield} min={0} max={1} step={0.05} tested={[0, 1]} onChange={(v) => setP({ ...p, efield: v })} />}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { loadTested(inv); setSeed((s) => s + 1); }} className="rounded-sm border border-line px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-2 hover:border-white hover:text-white">
              Tested setup
            </button>
            <button onClick={() => { setP({ ...cond, efield: 0 }); setSeed((s) => s + 1); }} className="rounded-sm border border-blue/50 px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-blue hover:bg-blue/10">
              Mission atmos.
            </button>
          </div>
          <button onClick={() => setSeed((s) => s + 1)} className="rounded-sm bg-white py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-blue">
            ↻ Re-ignite
          </button>
          <div className="border-t border-line pt-3">
            <div className="flex flex-wrap gap-1">
              {inv.categories.map((c) => (
                <CatChip key={c} c={c} />
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">{inv.findings[0]}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onOpen(inv.id)} className="flex-1 rounded-sm border border-line py-1.5 text-[11px] text-white hover:border-white">
                Full dossier
              </button>
              <button onClick={() => ai.run({ mode: "interpret", ids: [inv.id], conditions: { ...p, label } })} className="flex-1 rounded-sm bg-blue/15 py-1.5 text-[11px] text-blue hover:bg-blue/25">
                {ai.loading ? "Thinking…" : "✦ AI interpret"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {ai.text && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass hud mt-4 p-5">
            <div className="label mb-2">✦ AI interpretation: {inv.acronym} at {p.o2}% O₂ · {p.pressure} kPa · {p.gravity} g</div>
            <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} />
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">Simulations visualise qualitative trends reported by each investigation (heuristic, not validated CFD).</p>
    </Section>
  );
}
