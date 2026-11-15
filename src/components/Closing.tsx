"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Droplets, Radar, Shirt, Wind, type LucideIcon } from "lucide-react";
import { WEIGHTS } from "@/lib/scoring";
import { Section } from "./ui";

const SPINOFFS: { icon: LucideIcon; t: string; d: string; link: string | null; tone: string }[] = [
  { icon: Droplets, t: "Water-mist extinguishers", d: "Developed for the ISS and now used in buildings and ships. They use far less water and cause less damage than sprinklers.", link: "flex-2", tone: "#1f5cff" },
  { icon: Radar, t: "Smarter smoke detectors", d: "Research on telling smoke from dust cuts false alarms in mines, factories and homes.", link: "same", tone: "#7c5cff" },
  { icon: Wind, t: "Firefighter air tanks", d: "Spacesuit life-support technology made breathing apparatus lighter and longer-lasting.", link: null, tone: "#12b886" },
  { icon: Shirt, t: "Fire-resistant gear", d: "Spacesuit materials improved the heat protection and mobility of firefighter turnout gear.", link: null, tone: "#ff6a2b" },
];

export function Spinoffs({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <Section
      id="earth"
      eyebrow="Back on Earth"
      title={
        <>
          Space fire research <span className="text-go">protects people at home.</span>
        </>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-[32px] bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {SPINOFFS.map((s, k) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: k * 0.08, duration: 0.6 }}
            className="group flex flex-col bg-white p-7 transition-colors hover:bg-paper"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" style={{ background: `${s.tone}14`, color: s.tone }}>
              <s.icon size={22} />
            </span>
            <div className="display mt-10 text-[1.3rem] font-semibold leading-tight">{s.t}</div>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">{s.d}</p>
            {s.link && (
              <button onClick={() => onOpen(s.link!)} className="mt-auto inline-flex items-center gap-1 pt-6 text-[0.85rem] font-semibold" style={{ color: s.tone }}>
                See the PSI experiment <ArrowUpRight size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

export function Methodology({ source }: { source: "supabase" | "local" }) {
  const terms = [
    ["Oxygen fit", WEIGHTS.o2],
    ["Pressure fit", WEIGHTS.pressure],
    ["Airflow fit", WEIGHTS.flow],
    ["Fuel relevance", WEIGHTS.fuel],
    ["Directness", WEIGHTS.directness],
  ] as const;
  return (
    <Section id="method" eyebrow="Methodology and sources" title={<>Transparent <span className="text-blue">by design.</span></>}>
      <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div>
          <h3 className="text-[1.3rem] font-semibold">How relevance is scored</h3>
          <div className="mt-5 space-y-2.5">
            {terms.map(([l, w]) => (
              <div key={l} className="flex items-center gap-3 text-[0.9rem]">
                <span className="w-32 text-ink-2">{l}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.span initial={{ width: 0 }} whileInView={{ width: `${w * 100 * 3.33}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} className="block h-full rounded-full bg-blue" />
                </span>
                <span className="tnum w-10 text-right font-semibold">{Math.round(w * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[0.9rem] leading-relaxed text-ink-2">
            A fit is 1 inside the tested range and decays exponentially outside it (oxygen scale 8%, pressure 25 kPa, airflow 15 cm/s). Solids score highest for fuel relevance because they are what burns in a cabin. Directness rates how directly an experiment informs crew fire safety.
          </p>
        </div>
        <div>
          <h3 className="text-[1.3rem] font-semibold">The AI layer</h3>
          <p className="mt-5 text-[0.9rem] leading-relaxed text-ink-2">
            Every request to Google Gemini includes the full structured dataset, the current ranking and the generated insights. The model must cite experiments, must not invent numbers, and must name the missing experiment when the data cannot answer. Citations become clickable links. Questions are logged anonymously to Supabase.
          </p>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-2">The flammability index (O₂/21)^1.6 × (P/101.3)^0.2 is an illustrative heuristic, not a certified model.</p>
        </div>
        <div>
          <h3 className="text-[1.3rem] font-semibold">Sources</h3>
          <ul className="mt-5 divide-y divide-line text-[0.9rem]">
            {[
              ["NASA Physical Sciences Informatics, combustion", "https://psi.nasa.gov/physci/repo/search?q=combustion&data_source=psi&data_type=investigation"],
              ["NASA Glenn combustion research", "https://www.nasa.gov/glenn/research/combustion-and-reacting-systems/"],
              ["A Researcher's Guide to ISS Combustion Science (2015)", null],
              ["Space Apps 2026: Flame in Freefall brief", null],
              ["NASA Spinoff: detectors, air tanks, fire gear", null],
            ].map(([t, h]) => (
              <li key={t} className="py-2.5">
                {h ? (
                  <a href={h} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-blue hover:underline">
                    {t} <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <span className="text-ink-2">{t}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-2xl bg-white p-4 text-[0.82rem] text-ink-3 ring-1 ring-line">
            Served from <b className="text-ink">{source === "supabase" ? "Supabase (live)" : "the bundled dataset"}</b>. Condition ranges are summarized from public descriptions and marked approximate where they are not taken from exact test matrices.
          </p>
        </div>
      </div>
    </Section>
  );
}
