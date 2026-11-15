"use client";

import { motion } from "framer-motion";
import { WEIGHTS } from "@/lib/scoring";
import { Reveal, Section } from "./ui";

export function GravityGap({ onOpen }: { onOpen: (id: string) => void }) {
  const stops = [
    { g: 0, l: "Microgravity", s: "ISS · 20 PSI investigations", c: "#5cc8ff", data: true },
    { g: 0.166, l: "Moon", s: "No PSI data yet · LUCI, FM2 planned", c: "#e8eefc", data: false },
    { g: 0.38, l: "Mars", s: "No combustion data", c: "#ff5f3a", data: false },
    { g: 1, l: "Earth", s: "Decades of 1-g testing (NASA-STD-6001)", c: "#ffa94d", data: true },
  ];
  return (
    <Section
      id="gravity"
      eyebrow="06 · The Gravity Gap"
      title={
        <>
          The Moon sits in a <span className="italic text-gradient-warm">data blind spot.</span>
        </>
      }
      intro="PSI holds no partial-gravity combustion data yet. Until LUCI and FM2 fly, lunar and Martian fire behaviour has to be bounded between microgravity and Earth results."
    >
      <div className="glass hud rounded-xl p-6 sm:p-10">
        <div className="relative mx-2 h-2 rounded-full bg-gradient-to-r from-blue via-white/20 to-amber">
          <motion.div
            className="absolute -top-1 h-4 rounded-full bg-[repeating-linear-gradient(45deg,rgba(255,95,58,0.6)_0_6px,transparent_6px_12px)]"
            style={{ left: "10%", width: "35%" }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          />
          {stops.map((s) => (
            <div key={s.l} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.g * 100}%` }}>
              <div className="h-5 w-5 rounded-full border-2 bg-bg" style={{ borderColor: s.c, boxShadow: `0 0 18px ${s.c}` }} />
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {stops.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08}>
              <div className={`rounded-2xl border p-4 ${s.data ? "border-line" : "border-ember/30 bg-ember/[0.05]"}`}>
                <div className="font-mono text-xs text-ink-3">{s.g} g</div>
                <div className="mt-1 text-lg font-semibold" style={{ color: s.c }}>
                  {s.l}
                </div>
                <div className="mt-1 text-xs text-ink-3">{s.s}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-blue/25 bg-blue/[0.05] p-5 text-sm leading-relaxed text-ink-2">
          <strong className="text-blue">Proxy available:</strong> the{" "}
          <button onClick={() => onOpen("e-field")} className="text-ink underline decoration-blue underline-offset-4">
            E-FIELD Flames
          </button>{" "}
          experiment used electric fields acting on flame ions to create buoyancy-like flow, so it mimics partial gravity. It is the closest analogue to lunar conditions in PSI today.
        </div>
      </div>
    </Section>
  );
}

const SPINOFFS = [
  { i: "💧", t: "Fine-water-mist extinguishers", d: "Developed for the ISS, now used in buildings and ships. It uses far less water and does less damage than sprinklers.", link: "flex-2" },
  { i: "📡", t: "Smart smoke detectors", d: "A 1970s shuttle detector that tells smoke from dust cuts nuisance alarms in mines and industry.", link: "same" },
  { i: "🫁", t: "Firefighter air tanks", d: "Spacesuit life-support tech made breathing apparatus lighter and longer-lasting.", link: null },
  { i: "🧥", t: "Fire-resistant attire", d: "Spacesuit materials improved the heat protection and mobility of firefighter turnout gear.", link: null },
];

export function Spinoffs({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <Section
      id="earth"
      eyebrow="07 · Back on Earth"
      title={
        <>
          Space fire research <span className="italic text-ink-2">protects people at home.</span>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SPINOFFS.map((s, k) => (
          <Reveal key={s.t} delay={k * 0.07}>
            <div className="glass hud h-full rounded-xl p-6 transition hover:border-green/40">
              <div className="text-3xl">{s.i}</div>
              <div className="mt-4 font-semibold text-ink">{s.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.d}</p>
              {s.link && (
                <button onClick={() => onOpen(s.link!)} className="mt-4 text-xs text-green hover:underline">
                  Related PSI data →
                </button>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Methodology({ source }: { source: "supabase" | "local" }) {
  return (
    <Section id="method" eyebrow="08 · Methodology & Sources" title="Transparent by design.">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass hud rounded-xl p-6">
          <h3 className="font-semibold">Relevance score</h3>
          <div className="mt-3 rounded-xl bg-bg/60 p-3 font-mono text-[0.72rem] leading-relaxed text-ink-2">
            score = {WEIGHTS.o2}·O₂fit + {WEIGHTS.pressure}·Pfit + {WEIGHTS.flow}·flowfit + {WEIGHTS.fuel}·fuel + {WEIGHTS.directness}·directness
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            The fit terms are 1 inside the tested range and decay exponentially outside it (O₂ scale 8%, pressure 25 kPa, flow 15 cm/s). Fuel relevance: solid 1.0, aerosol 0.85, liquid 0.7, gas 0.6. Directness is a 0–1 expert rating of how directly an investigation informs crew-habitat fire safety, taken from the challenge brief. A focus filter scales non-matching pillars by 0.6.
          </p>
        </div>
        <div className="glass hud rounded-xl p-6">
          <h3 className="font-semibold">AI layer</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            Google Gemini receives the complete structured dataset, the current ranking and the auto-generated insights in every request. It is instructed to cite investigations as [ACRONYM], to refuse to invent numbers, and to name the missing experiment when the data can&apos;t answer. Citations become clickable chips. Questions are logged anonymously to Supabase to show what researchers want to know.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">The flammability index (O₂/21)^1.6·(P/101.3)^0.2 is an illustrative heuristic, not a certified model.</p>
        </div>
        <div className="glass hud rounded-xl p-6">
          <h3 className="font-semibold">Sources</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-3">
            <li>
              <a className="text-blue hover:underline" href="https://psi.nasa.gov/physci/repo/search?q=combustion&data_source=psi&data_type=investigation" target="_blank" rel="noreferrer">
                NASA Physical Sciences Informatics (PSI), Combustion
              </a>
            </li>
            <li>
              <a className="text-blue hover:underline" href="https://www.nasa.gov/glenn/research/combustion-and-reacting-systems/" target="_blank" rel="noreferrer">
                NASA Combustion Science (Glenn Research Center)
              </a>
            </li>
            <li>A Researcher&apos;s Guide to ISS Combustion Science (NASA, 2015)</li>
            <li>NASA Space Apps 2026 &ldquo;Flame in Freefall&rdquo; challenge brief</li>
            <li>NASA Spinoff: fire detector, fireman&apos;s air tanks, fire attire</li>
          </ul>
          <p className="mt-4 rounded-xl border border-line bg-bg/40 p-3 text-xs text-ink-3">
            Data served from <span className="font-mono text-ink">{source === "supabase" ? "Supabase (live)" : "bundled dataset"}</span>. Condition ranges are envelopes summarised from public descriptions and flagged &ldquo;approximate&rdquo; where not taken from exact test matrices.
          </p>
        </div>
      </div>
    </Section>
  );
}
