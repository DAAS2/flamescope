"use client";

import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Investigation } from "@/data/investigations";
import type { Conditions } from "@/lib/scoring";
import { AIText, useAI } from "./ai";

const PROMPTS = [
  "Which experiments best predict material flammability at 34% O₂ in a lunar rover?",
  "What did FLEX teach us about CO₂ versus helium as a suppressant?",
  "Why might a smoke detector miss a fire in microgravity?",
  "Should crews shut off ventilation fans during a cabin fire?",
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
    <div className="overflow-hidden rounded-3xl bg-paper">
      <div ref={box} data-lenis-prevent className="scrollbar-thin max-h-[480px] min-h-[260px] space-y-4 overflow-y-auto p-5 sm:p-6">
        {msgs.length === 0 && !ai.loading && (
          <div>
            <p className="mb-3 text-[0.88rem] text-ink-3">
              Answers are grounded in the 20 PSI experiments, set in the context of {label}, and cite their sources. Start with one of these:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROMPTS.map((p, i) => (
                <motion.button
                  key={p}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => send(p)}
                  className="rounded-2xl bg-white p-4 text-left text-[0.88rem] text-ink-2 ring-1 ring-line transition hover:text-ink hover:ring-blue"
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
        {ai.loading && <Bubble m={{ role: "model", text: ai.text || "_Reading 20 investigations…_" }} loading investigations={investigations} onOpen={onOpen} />}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
        className="p-3 pt-0 sm:p-4 sm:pt-0"
      >
        <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 ring-1 ring-line focus-within:ring-blue">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={1000}
            placeholder={`Ask about fire safety for ${label}…`}
            className="min-w-0 flex-1 bg-transparent text-[0.92rem] text-ink placeholder:text-ink-3 focus:outline-none"
            aria-label="Ask a question"
          />
          <button type="submit" disabled={ai.loading || !q.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition hover:bg-blue disabled:opacity-40" aria-label="Send">
            <ArrowUp size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ m, loading, investigations, onOpen }: { m: Msg; loading?: boolean; investigations: Investigation[]; onOpen: (id: string) => void }) {
  if (m.role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-3 text-[0.9rem] text-white">{m.text}</div>
      </div>
    );
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue text-white">
        <Sparkles size={14} />
      </div>
      <div className="min-w-0 max-w-[92%] rounded-3xl rounded-tl-lg bg-white px-4 py-3 ring-1 ring-line">
        <AIText text={m.text} loading={loading} investigations={investigations} onCite={onOpen} />
      </div>
    </div>
  );
}
