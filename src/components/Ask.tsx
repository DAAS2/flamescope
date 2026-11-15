"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Investigation } from "@/data/investigations";
import type { Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { Section } from "./ui";

const PROMPTS = [
  "Which investigations best predict material flammability at 34% O₂ in a lunar rover?",
  "What did FLEX teach us about CO₂ vs helium as a fire suppressant?",
  "Why might a smoke detector miss a fire in microgravity?",
  "Should crews shut off ventilation fans during a cabin fire?",
  "What data would I need to model a fire on the Moon that PSI doesn't have yet?",
  "Which ISS hardware was shared between BASS, SPICE and SLICE?",
];

interface Msg {
  role: "user" | "model";
  text: string;
}

export default function Ask({ investigations, cond, label, onOpen }: { investigations: Investigation[]; cond: Conditions; label: string; onOpen: (id: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const ai = useAI();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el && (msgs.length || ai.text)) el.scrollTop = el.scrollHeight;
  }, [msgs.length, ai.text]);

  const send = async (question: string) => {
    if (!question.trim() || ai.loading) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: question }]);
    setQ("");
    const answer = await ai.run({ mode: "ask", question, conditions: { ...cond, label }, history });
    setMsgs((m) => [...m, { role: "model", text: answer }]);
    ai.setText("");
  };

  return (
    <Section
      id="ask"
      eyebrow="05 · Ask FlameScope"
      title={
        <>
          Ask the data <span className="italic text-gradient">anything.</span>
        </>
      }
      intro={`An AI analyst grounded in the PSI combustion dataset. It answers in the context of ${label}, cites every investigation it uses, and says so when the data doesn't cover your question.`}
    >
      <div className="glass hud overflow-hidden rounded-xl">
        <div ref={box} className="scrollbar-thin max-h-[560px] min-h-[280px] space-y-5 overflow-y-auto p-5 sm:p-8">
          {msgs.length === 0 && !ai.loading && (
            <div>
              <p className="mb-4 text-sm text-ink-3">Try one of these:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROMPTS.map((p, i) => (
                  <motion.button
                    key={p}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => send(p)}
                    className="rounded-2xl border border-line bg-white/[0.02] p-4 text-left text-sm text-ink-2 transition hover:border-blue hover:bg-blue/[0.06] hover:text-ink"
                  >
                    {p}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <Bubble key={i} m={m} investigations={investigations} onOpen={onOpen} />
          ))}
          {ai.loading && <Bubble m={{ role: "model", text: ai.text || "_Searching 20 investigations…_" }} loading investigations={investigations} onOpen={onOpen} />}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(q);
          }}
          className="flex gap-2 border-t border-line bg-bg/40 p-3 sm:p-4"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={1000}
            placeholder={`Ask about fire safety for ${label}…`}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-bg/60 px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:border-blue focus:outline-none"
            aria-label="Ask a question"
          />
          <button type="submit" disabled={ai.loading || !q.trim()} className="rounded-2xl bg-blue px-5 text-sm font-semibold text-bg transition hover:bg-white disabled:opacity-50">
            Ask
          </button>
        </form>
      </div>
    </Section>
  );
}

function Bubble({ m, loading, investigations, onOpen }: { m: Msg; loading?: boolean; investigations: Investigation[]; onOpen: (id: string) => void }) {
  if (m.role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue/15 px-4 py-3 text-sm text-ink">{m.text}</div>
      </div>
    );
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue-deep text-xs text-bg">✦</div>
      <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-white/[0.02] px-4 py-3">
        <AIText text={m.text} loading={loading} investigations={investigations} onCite={onOpen} />
      </div>
    </div>
  );
}
