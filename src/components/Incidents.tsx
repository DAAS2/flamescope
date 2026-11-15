"use client";

import { Reveal } from "./ui";

const items = [
  { y: "1967", t: "Apollo 1", d: "A pre-launch test fire in a 100% oxygen cabin killed three astronauts in seconds. Oxygen concentration became NASA's #1 flammability variable.", c: "text-ember" },
  { y: "1970", t: "Apollo 13", d: "An oxygen tank exploded on the way to the Moon. The crew survived, and NASA rethought oxygen-system ignition hazards.", c: "text-amber" },
  { y: "1997", t: "Mir", d: "An oxygen generator failure started a fire on the Mir space station during joint operations. The multinational crew put it out and survived.", c: "text-amber" },
  { y: "2026", t: "Artemis II", d: "A smoke alarm sounded about 80,000 miles from home. Detection worked, a reminder that fire safety runs the whole length of every mission.", c: "text-blue" },
];

export default function Incidents() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.t} delay={i * 0.08} className="h-full">
            <div className="group h-full bg-bg-2/90 p-6 transition hover:bg-[#0b1120]">
              <div className={`font-mono text-sm ${it.c}`}>{it.y}</div>
              <div className="mt-1 font-display text-2xl text-ink">{it.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-3 group-hover:text-ink-2">{it.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-ink-3">
        Prevention · Detection · Suppression: the three pillars of NASA spacecraft fire safety, and how FlameScope organises every insight.
      </p>
    </div>
  );
}
