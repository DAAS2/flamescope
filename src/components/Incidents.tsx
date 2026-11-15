"use client";

import { motion } from "framer-motion";
import { CAT_META } from "./ui";

const items = [
  { y: "1967", t: "Apollo 1", d: "A test fire in a 100% oxygen cabin killed three astronauts in seconds. Oxygen became NASA's number one flammability variable.", tone: "#ff6a2b" },
  { y: "1970", t: "Apollo 13", d: "An oxygen tank exploded on the way to the Moon. The crew survived, and NASA rethought ignition hazards in oxygen systems.", tone: "#ffb347" },
  { y: "1997", t: "Mir", d: "An oxygen generator caught fire aboard the station. The multinational crew put it out with smoke filling the modules.", tone: "#ffb347" },
  { y: "2026", t: "Artemis II", d: "A smoke alarm sounded about 80,000 miles from home. Detection worked, which is the point of everything on this page.", tone: "#1f5cff" },
];

export default function Incidents() {
  return (
    <section className="relative bg-paper">
      <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.4fr] md:gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <h2 className="text-[2.2rem] font-semibold leading-[1.04] sm:text-5xl">
              Fire is the hazard every crew <span className="text-flame">trains for.</span>
            </h2>
            <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-2">NASA organizes spacecraft fire safety into three pillars. FlameScope tags every experiment and every insight with them.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(["prevention", "detection", "suppression"] as const).map((c) => {
                const m = CAT_META[c];
                return (
                  <span key={c} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[0.88rem] font-semibold ring-1 ring-line" style={{ color: m.color }}>
                    <m.icon size={15} />
                    {m.label}
                  </span>
                );
              })}
            </div>
          </motion.div>

          <ol className="relative">
            <motion.span
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-3 left-[7px] top-3 w-px origin-top bg-line-2"
            />
            {items.map((it, i) => (
              <motion.li
                key={it.t}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
                className="relative grid grid-cols-[15px_1fr] gap-5 pb-9 last:pb-0"
              >
                <span className="relative mt-2 h-[15px] w-[15px] rounded-full border-[3px] border-paper" style={{ background: it.tone, boxShadow: `0 0 0 1px ${it.tone}` }} />
                <div className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-6">
                  <div className="display tnum text-[1.6rem] font-semibold leading-tight text-ink-3">{it.y}</div>
                  <div>
                    <div className="display text-[1.5rem] font-semibold leading-tight">{it.t}</div>
                    <p className="mt-1.5 max-w-lg text-[0.95rem] leading-relaxed text-ink-2">{it.d}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
