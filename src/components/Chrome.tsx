"use client";

import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";

/** Lusion-style numeric preloader: "ignition sequence". */
export function Preloader() {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1500);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-0 z-[100] flex items-center justify-center bg-night text-snow">
          <div className="w-56 text-center">
            <div className="display tnum text-5xl font-semibold">{n}<span className="text-snow-3">%</span></div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-flame" style={{ width: `${n}%` }} />
            </div>
            <div className="mt-3 text-[0.85rem] text-snow-3">Loading NASA combustion data</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Custom cursor ring that grows over interactive elements (desktop only). */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.body.classList.add("has-cursor");
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      big = false,
      raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement;
      big = !!t.closest("a,button,input,select,[role=button],canvas");
    };
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) scale(${big ? 1.8 : 1})`;
      }
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move);
    loop();
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      document.body.classList.remove("has-cursor");
    };
  }, []);
  return (
    <>
      <div ref={ring} className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-8 w-8 rounded-full border border-white/70 mix-blend-difference transition-[width,height] duration-200 [@media(pointer:fine)]:block" />
      <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-1 w-1 rounded-full bg-white mix-blend-difference [@media(pointer:fine)]:block" />
    </>
  );
}

/** Lenis smooth scrolling + anchor links. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.querySelector(a.getAttribute("href")!);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -70 });
      }
    };
    document.addEventListener("click", onClick);
    (window as unknown as { __lenis: Lenis }).__lenis = lenis;
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
