"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { Investigation, SafetyCategory } from "@/data/investigations";
import { missions, type Mission } from "@/lib/missions";
import type { Conditions } from "@/lib/scoring";
import Ascent from "./Ascent";
import { Preloader, SmoothScroll } from "./Chrome";
import { Methodology, Spinoffs } from "./Closing";
import Dossier from "./Dossier";
import Hero from "./Hero";
import Incidents from "./Incidents";
import MissionControl from "./MissionControl";
import Simulator from "./Simulator";
import { MISSION_ICON } from "./ui";

const GravityGap = dynamic(() => import("./GravityGap"), { ssr: false, loading: () => <div className="h-[100svh]" /> });

const NAV = [
  ["ascent", "Oxygen"],
  ["simulator", "Experiments"],
  ["control", "Mission Control"],
  ["gravity", "Gravity"],
  ["method", "Method"],
];

export default function Dashboard({ investigations, source }: { investigations: Investigation[]; source: "supabase" | "local" }) {
  const start = missions[1];
  const [missionId, setMissionId] = useState(start.id);
  const [cond, setCondRaw] = useState<Conditions>({ o2: start.o2, pressure: start.pressure, flow: start.flow, gravity: start.gravity });
  const [focus, setFocus] = useState<SafetyCategory | "all">("all");
  const [compareIds, setCompareIds] = useState<string[]>(["saffire-1", "bass-ii"]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [onHero, setOnHero] = useState(true);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  useMotionValueEvent(scrollY, "change", (v) => setOnHero(v < window.innerHeight * 0.85));

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
  const cur = missions.find((m) => m.id === missionId);
  const CurIcon = MISSION_ICON[missionId] ?? MISSION_ICON.custom;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <Preloader />
      <SmoothScroll />
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-flame" />

      {/* Floating pill nav */}
      <nav className="fixed inset-x-0 top-3 z-30 px-3 sm:top-4">
        <div
          className={`mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-full py-1.5 pl-4 pr-1.5 transition-colors duration-500 ${
            onHero ? "frost text-snow" : "bg-white/90 text-ink shadow-[0_10px_40px_-16px_rgba(16,24,40,0.3)] ring-1 ring-line backdrop-blur-xl"
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5" aria-label="FlameScope home">
            <Logo />
            <span className="display text-[1.05rem] font-semibold tracking-tight">FlameScope</span>
          </a>
          <div className="hidden items-center gap-0.5 lg:flex">
            {NAV.map(([id, l]) => (
              <a key={id} href={`#${id}`} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[0.88rem] font-medium transition ${onHero ? "text-snow-2 hover:bg-white/10 hover:text-snow" : "text-ink-2 hover:bg-paper hover:text-ink"}`}>
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`hidden items-center gap-1.5 whitespace-nowrap px-2 text-[0.78rem] sm:inline-flex ${onHero ? "text-snow-3" : "text-ink-3"}`} title={source === "supabase" ? "Served from Supabase" : "Bundled dataset"}>
              <span className={`h-1.5 w-1.5 rounded-full ${source === "supabase" ? "bg-go" : "bg-warn"}`} />
              {source === "supabase" ? "Live data" : "Local data"}
            </span>
            <a href="#control" className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full py-2 pl-3 pr-4 text-[0.85rem] font-semibold transition ${onHero ? "bg-white text-ink hover:bg-blue hover:text-white" : "bg-ink text-white hover:bg-blue"}`}>
              <CurIcon size={15} />
              {cur?.short ?? "Custom"}
            </a>
            <button onClick={() => setMenu(!menu)} className={`flex h-9 w-9 items-center justify-center rounded-full lg:hidden ${onHero ? "hover:bg-white/10" : "hover:bg-paper"}`} aria-label="Menu" aria-expanded={menu}>
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className="mx-auto mt-2 grid max-w-[1100px] gap-1 rounded-3xl bg-white p-2 shadow-xl ring-1 ring-line lg:hidden">
              {NAV.map(([id, l]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenu(false)} className="rounded-2xl px-4 py-3 text-[0.95rem] font-medium text-ink hover:bg-paper">
                  {l}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <Hero investigations={investigations} missionId={missionId} setMission={setMission} cond={cond} />
      <Incidents />
      <Ascent investigations={investigations} onOpen={onOpen} />
      <Simulator investigations={investigations} cond={cond} label={label} onOpen={onOpen} />
      <MissionControl
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
      <GravityGap investigations={investigations} onOpen={onOpen} />
      <Spinoffs onOpen={onOpen} />
      <Methodology source={source} />

      <footer className="mx-auto max-w-[1240px] px-4 pb-10 sm:px-6">
        <div className="panel-dark flex flex-col gap-6 p-8 sm:flex-row sm:items-end sm:justify-between sm:p-12">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="display text-2xl font-semibold">FlameScope</span>
            </div>
            <p className="mt-3 max-w-md text-[0.95rem] text-snow-2">Making the next giant leap a safer one. Built for NASA Space Apps Challenge 2026, Flame in Freefall.</p>
          </div>
          <div className="text-[0.85rem] text-snow-3 sm:text-right">
            Data from NASA Physical Sciences Informatics
            <br />
            Not an official NASA product
          </div>
        </div>
      </footer>

      <Dossier inv={investigations.find((i) => i.id === openId)} onClose={onClose} cond={cond} label={label} investigations={investigations} onOpen={onOpen} compareIds={compareIds} toggleCompare={toggleCompare} />
    </div>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="12" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="13" cy="13" r="5.5" fill="#1f5cff" />
      <path d="M13 3.5c2.4 2.6 3.2 4.6 2.4 6.4-.5 1.1-1.4 1.6-2.4 1.6s-1.9-.5-2.4-1.6c-.8-1.8 0-3.8 2.4-6.4z" fill="#ff6a2b" />
    </svg>
  );
}
