"use client";

import { useEffect, useRef } from "react";

/**
 * A live, procedurally drawn candle flame. At 1 g buoyancy stretches it into a
 * flickering yellow-orange teardrop. Toward 0 g it relaxes into a calm, dim,
 * blue sphere sustained only by diffusion.
 */
export default function FlameViz({ gravity, o2 = 21, size = 360 }: { gravity: number; o2?: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef(gravity);
  const ox = useRef(o2);
  g.current = gravity;
  ox.current = o2;

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = size * dpr;
    cvs.height = size * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    let t = 0;
    let smooth = g.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      t += reduce ? 0 : 0.016;
      smooth += (g.current - smooth) * 0.08;
      const gg = Math.max(0, Math.min(1, smooth));
      const boost = Math.min(1.6, Math.max(0.7, ox.current / 21)) ** 0.5; // more O₂ → bigger, brighter
      const W = size,
        H = size;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const wickY = H * 0.72;
      const r = H * 0.13 * boost;
      const stretch = 1 + gg * 1.9; // vertical elongation from buoyancy
      const flick = gg * (Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.03);
      const sway = gg * Math.sin(t * 3.1) * 6;
      const centerY = wickY - r * (0.7 + gg * 0.55);

      // Build flame outline: circle → teardrop
      const path = new Path2D();
      const N = 80;
      for (let k = 0; k <= N; k++) {
        const a = (k / N) * Math.PI * 2;
        const sx = Math.sin(a);
        const cy = Math.cos(a); // +1 at top
        const up = Math.max(0, cy);
        const taper = 1 - up ** 1.6 * gg * 0.85;
        const x = cx + sx * r * taper * (1 + flick) + sway * up ** 2;
        const y = centerY - cy * r * (cy > 0 ? stretch * (1 + flick * 2) : 1 - gg * 0.35);
        if (k === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();

      // Wick + candle
      ctx.fillStyle = "#1b1f2c";
      ctx.fillRect(cx - 2, wickY - r * 0.3, 4, r * 0.4);
      const cg = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0);
      cg.addColorStop(0, "#1a2036");
      cg.addColorStop(0.5, "#2c3552");
      cg.addColorStop(1, "#141a2c");
      ctx.fillStyle = cg;
      roundRect(ctx, cx - 26, wickY + r * 0.15, 52, H * 0.3, 8);
      ctx.fill();

      // Outer glow
      const glowR = r * (2.6 + gg * 1.2);
      const glow = ctx.createRadialGradient(cx, centerY - gg * r, 0, cx, centerY - gg * r, glowR);
      glow.addColorStop(0, `rgba(${lerp(92, 255, gg)},${lerp(200, 170, gg)},${lerp(255, 80, gg)},${0.28 * boost})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Flame body
      const grad = ctx.createLinearGradient(cx, centerY + r, cx, centerY - r * stretch);
      grad.addColorStop(0, `rgba(${lerp(60, 70, gg)},${lerp(120, 110, gg)},255,${lerpf(0.75, 0.9, gg)})`);
      grad.addColorStop(0.25, `rgba(${lerp(80, 255, gg)},${lerp(170, 140, gg)},${lerp(255, 60, gg)},${lerpf(0.6, 0.95, gg)})`);
      grad.addColorStop(0.7, `rgba(${lerp(120, 255, gg)},${lerp(210, 210, gg)},${lerp(255, 120, gg)},${lerpf(0.55, 0.95, gg)})`);
      grad.addColorStop(1, `rgba(255,${lerp(240, 250, gg)},${lerp(255, 210, gg)},${lerpf(0.5, 0.85, gg)})`);
      ctx.save();
      ctx.shadowColor = gg > 0.5 ? "rgba(255,150,60,0.9)" : "rgba(92,200,255,0.9)";
      ctx.shadowBlur = 40;
      ctx.fillStyle = grad;
      ctx.fill(path);
      ctx.restore();

      // Inner core
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const core = ctx.createRadialGradient(cx, centerY + r * 0.2, 0, cx, centerY + r * 0.2, r * 0.9);
      core.addColorStop(0, `rgba(255,255,255,${lerpf(0.08, 0.55, gg)})`);
      core.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = core;
      ctx.fill(path);
      ctx.restore();

      // Rising soot / hot gas particles (only with buoyancy)
      if (gg > 0.05) {
        for (let i = 0; i < 14; i++) {
          const ph = (t * 0.6 + i / 14) % 1;
          const px = cx + Math.sin(i * 7.3 + t) * 10 * ph + sway;
          const py = centerY - r * stretch - ph * H * 0.35 * gg;
          ctx.fillStyle = `rgba(255,190,120,${(1 - ph) * 0.35 * gg})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Diffusion halo rings in µg
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.25 + i / 3) % 1;
          ctx.strokeStyle = `rgba(92,200,255,${(1 - ph) * 0.18})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, centerY, r * (1.2 + ph * 1.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="max-w-full"
      role="img"
      aria-label={`Simulated candle flame at ${gravity.toFixed(2)} g`}
    />
  );
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const lerpf = (a: number, b: number, t: number) => (a + (b - a) * t).toFixed(3);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
