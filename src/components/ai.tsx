"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Conditions } from "@/lib/scoring";
import type { Investigation } from "@/data/investigations";

export type AIMode = "ask" | "briefing" | "interpret" | "compare";

export function useAI() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(
    async (payload: {
      mode: AIMode;
      conditions: Conditions & { label?: string };
      question?: string;
      ids?: string[];
      history?: { role: "user" | "model"; text: string }[];
    }) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setText("");
      setLoading(true);
      let acc = "";
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: c.signal,
        });
        if (!res.body) throw new Error("no body");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setText(acc);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          acc = acc || "Sorry, the analysis service is unreachable right now.";
          setText(acc);
        }
      } finally {
        if (ctrl.current === c) setLoading(false);
      }
      return acc;
    },
    [],
  );

  return { text, loading, run, setText };
}

/** Renders AI markdown and turns [ACRONYM] citations into clickable chips. */
export function AIText({
  text,
  loading,
  investigations,
  onCite,
}: {
  text: string;
  loading?: boolean;
  investigations: Investigation[];
  onCite?: (id: string) => void;
}) {
  const map = new Map(investigations.map((i) => [i.acronym.toLowerCase(), i.id]));
  const linked = text.replace(/\[([A-Za-z0-9\-\s]+?)\](?!\()/g, (m, acr: string) => {
    const id = map.get(acr.trim().toLowerCase());
    return id ? `[${acr.trim()}](#cite-${id})` : m;
  });
  return (
    <div className={`prose-ai text-sm ${loading ? "caret" : ""}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) {
              const id = href.slice(6);
              return (
                <button
                  type="button"
                  onClick={() => onCite?.(id)}
                  className="mx-0.5 inline-flex items-center rounded-full bg-blue-soft px-2 py-px text-[0.78rem] font-semibold text-blue transition hover:bg-blue hover:text-white"
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-blue underline-offset-2 hover:underline">
                {children}
              </a>
            );
          },
        }}
      >
        {linked}
      </ReactMarkdown>
    </div>
  );
}
