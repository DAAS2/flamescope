"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useCallback, useState } from "react";
import type { Investigation, SafetyCategory } from "@/data/investigations";
import { missions, type Mission } from "@/lib/missions";
import type { Conditions } from "@/lib/scoring";
import Ascent from "./Ascent";
import Ask from "./Ask";
import { Cursor, Preloader, SmoothScroll } from "./Chrome";
import { GravityGap, Methodology, Spinoffs } from "./Closing";
import Compare from "./Compare";
import Drawer from "./Drawer";
import Envelope from "./Envelope";
import Hero from "./Hero";
import Incidents from "./Incidents";
import MissionConsole from "./MissionConsole";
import Simulator from "./Simulator";

const NAV = [
  ["ascent", "O₂ Ascent"],
  ["simulator", "Simulator"],
  ["control", "Mission Control"],
  ["gravity", "Gravity Gap"],
  ["method", "Method"],
];

type Tab = "console" | "envelope" | "compare" | "ask";
const TABS: { id: Tab; l: string; d: string }[] = [
  { id: "console", l: "Ranking", d: "Relevance engine" },
  { id: "envelope", l: "Envelope", d: "O₂ × pressure map" },
  { id: "compare", l: "Compare", d: "Side by side" },
  { id: "ask", l: "Ask AI", d: "Grounded analyst" },
];

export default function Dashboard({ investigations, source }: { investigations: Investigation[]; source: "supabase" | "local" }) {
  const start = missions[1];
  const [missionId, setMissionId] = useState(start.id);
  const [cond, setCondRaw] = useState<Conditions>({ o2: start.o2, pressure: start.pressure, flow: start.flow, gravity: start.gravity });
  const [focus, setFocus] = useState<SafetyCategory | "all">("all");
  const [compareIds, setCompareIds] = useState<string[]>(["saffire-1", "bass-ii"]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<Tab>("console");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const label = missionId === "custom" ? `Custom (${cond.o2}% O₂, ${Math.round(cond.pressure)} kPa)` : missions.find((m) => m.id === missionId)!.name;

  const setMission = useCallback((m: Mission) => {
    setMissionId(m.id);
    setCondRaw({ o2: m.o2, pressure: m.pressure, flow: m.flow, gravity: m.gravity });
  }, []);
  const setCond = useCallback((c: Conditions) => {
    setMissionId("custom");
    setCondRaw(c);
  }, []);
  const toggleCompare = useCallback(
    (id: string) => setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 3 ? [...ids.slice(1), id] : [...ids, id])),
    [],
  );
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onClose = useCallback(() => setOpenId(null), []);
  const goTab = (t: Tab) => {
    setTab(t);
    const el = document.getElementById("control");
    const lenis = (window as unknown as { __lenis?: { scrollTo: (e: HTMLElement, o: object) => void } }).__lenis;
    if (el) {
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: "smooth" });
    }
  };
  const cur = missions.find((m) => m.id === missionId);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-black">
      <Preloader />
      <Cursor />
      <SmoothScroll />
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-blue" />

      <nav className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-white/30">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-white via-blue to-blue-deep shadow-[0_0_12px_#4fc3ff]" />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">FlameScope</span>
          </a>
          <div className="glass hidden items-center gap-1 rounded-full px-1.5 py-1 lg:flex">
            {NAV.map(([id, l]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2 transition hover:bg-white/10 hover:text-white">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 sm:inline-flex">
              <span className={`h-1.5 w-1.5 rounded-full ${source === "supabase" ? "bg-green shadow-[0_0_8px_#4ef0a8]" : "bg-amber"}`} />
              {source === "supabase" ? "Live PSI data" : "Local data"}
            </span>
            <a href="#top" className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-blue">
              {cur?.emoji ?? "⚙︎"} {cur?.short ?? "Custom"}
            </a>
            <button onClick={() => setMenu(!menu)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs lg:hidden" aria-label="Menu" aria-expanded={menu}>
              {menu ? "✕" : "☰"}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass hud mx-4 grid grid-cols-2 gap-1 p-2 lg:hidden">
              {NAV.map(([id, l]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenu(false)} className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-2 hover:bg-white/5">
                  {l}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <Hero investigations={investigations} missionId={missionId} setMission={setMission} cond={cond} />
      <div className="pt-16">
        <Incidents />
      </div>
      <Ascent investigations={investigations} onOpen={onOpen} />
      <Simulator investigations={investigations} cond={cond} label={label} onOpen={onOpen} />

      <section id="control" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
        <div className="mb-4 flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-blue">
          <span className="h-px w-8 bg-blue" />
          Mission Control
        </div>
        <div className="glass hud sticky top-16 z-20 grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative overflow-hidden rounded-sm px-4 py-3 text-left transition ${tab === t.id ? "text-black" : "text-white hover:bg-white/5"}`}>
              {tab === t.id && <motion.span layoutId="tab-bg" className="absolute inset-0 bg-white" transition={{ type: "spring", stiffness: 400, damping: 35 }} />}
              <span className="relative block text-sm font-semibold uppercase tracking-wide">{t.l}</span>
              <span className={`relative block font-mono text-[10px] uppercase tracking-wider ${tab === t.id ? "text-black/55" : "text-ink-3"}`}>{t.d}</span>
            </button>
          ))}
        </div>
      </section>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="-mt-8">
          {tab === "console" && (
            <MissionConsole
              investigations={investigations}
              missionId={missionId}
              setMission={setMission}
              cond={cond}
              setCond={setCond}
              focus={focus}
              setFocus={setFocus}
              onOpen={onOpen}
              compareIds={compareIds}
              toggleCompare={toggleCompare}
              label={label}
            />
          )}
          {tab === "envelope" && <Envelope investigations={investigations} cond={cond} onOpen={onOpen} setCond={setCond} />}
          {tab === "compare" && <Compare investigations={investigations} ids={compareIds} toggle={toggleCompare} cond={cond} label={label} onOpen={onOpen} />}
          {tab === "ask" && <Ask investigations={investigations} cond={cond} label={label} onOpen={onOpen} />}
        </motion.div>
      </AnimatePresence>

      <GravityGap onOpen={onOpen} />
      <Spinoffs onOpen={onOpen} />
      <Methodology source={source} />

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <span className="text-white">FlameScope</span> · NASA Space Apps Challenge 2026 · Flame in Freefall
          </div>
          <div>Data: NASA PSI · Not an official NASA product</div>
        </div>
      </footer>

      <AnimatePresence>
        {compareIds.length > 0 && !openId && tab !== "compare" && (
          <motion.button
            onClick={() => goTab("compare")}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="glass hud fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap py-2 pl-4 pr-2 text-xs shadow-2xl"
          >
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-ink-3 sm:inline">Compare</span>
            <span className="truncate font-medium text-white">{compareIds.map((id) => investigations.find((i) => i.id === id)?.acronym).join(" · ")}</span>
            <span className="rounded-sm bg-white px-3 py-1 font-semibold text-black">View →</span>
          </motion.button>
        )}
      </AnimatePresence>

      <Drawer inv={investigations.find((i) => i.id === openId)} onClose={onClose} cond={cond} label={label} investigations={investigations} onOpen={onOpen} />
    </div>
  );
}
