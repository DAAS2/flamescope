"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Investigation } from "@/data/investigations";
import type { Conditions } from "@/lib/scoring";
import { scoreInvestigation } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { FUEL_META, Section } from "./ui";

const COLORS = ["#5cc8ff", "#ffa94d", "#a78bfa"];

export default function Compare({
  investigations,
  ids,
  toggle,
  cond,
  label,
  onOpen,
}: {
  investigations: Investigation[];
  ids: string[];
  toggle: (id: string) => void;
  cond: Conditions;
  label: string;
  onOpen: (id: string) => void;
}) {
  const sel = ids.map((id) => investigations.find((i) => i.id === id)!).filter(Boolean);
  const ai = useAI();

  const axes = [
    { k: "O₂ span", f: (i: Investigation) => Math.min(1, (i.o2[1] - i.o2[0] + 2) / 40) },
    { k: "Pressure span", f: (i: Investigation) => Math.min(1, (i.pressure[1] - i.pressure[0] + 10) / 200) },
    { k: "Flow span", f: (i: Investigation) => Math.min(1, (i.flow[1] - i.flow[0] + 2) / 50) },
    { k: "Sensors", f: (i: Investigation) => Math.min(1, i.sensors.length / 5) },
    { k: "Directness", f: (i: Investigation) => i.directness },
    { k: "Mission fit", f: (i: Investigation) => scoreInvestigation(i, cond).score / 100 },
  ];
  const radar = axes.map((a) => ({ axis: a.k, ...Object.fromEntries(sel.map((s) => [s.id, Math.round(a.f(s) * 100)])) }));

  const rows: [string, (i: Investigation) => string][] = [
    ["Hardware", (i) => i.hardware],
    ["Fuel", (i) => `${FUEL_META[i.fuelType].label}: ${i.fuels.slice(0, 3).join(", ")}`],
    ["Geometry", (i) => i.sampleGeometry],
    ["O₂ (%)", (i) => `${i.o2[0]}–${i.o2[1]}`],
    ["Pressure (kPa)", (i) => `${i.pressure[0]}–${i.pressure[1]}`],
    ["Airflow (cm/s)", (i) => `${i.flow[0]}–${i.flow[1]}`],
    ["Diluents", (i) => i.diluents.join(", ") || "None"],
    ["Sensors", (i) => i.sensors.join(", ")],
    ["Varied", (i) => i.variables],
  ];

  const suggestions: [string, string[]][] = [
    ["Large vs small-scale solids", ["saffire-1", "bass-ii"]],
    ["Smoke vs dust", ["same-r", "daft"]],
    ["Droplet suppression", ["flex", "flex-2", "cfi"]],
  ];

  return (
    <Section
      id="compare"
      eyebrow="04 · Compare"
      title={
        <>
          Side by side, <span className="italic text-ink-2">similarities and differences.</span>
        </>
      }
      intro="Pick up to three investigations with + Compare, or start from a suggested pairing. FlameScope lines up their conditions and has the AI explain what each one uniquely contributes."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {suggestions.map(([l, s]) => (
          <button
            key={l}
            onClick={() => {
              ids.forEach((id) => !s.includes(id) && toggle(id));
              s.forEach((id) => !ids.includes(id) && toggle(id));
              ai.setText("");
            }}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 transition hover:border-blue hover:text-blue"
          >
            ⇄ {l}
          </button>
        ))}
      </div>

      {sel.length < 2 ? (
        <div className="glass hud flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
          <div className="text-4xl">⇄</div>
          <p className="mt-3 max-w-sm text-sm text-ink-3">Select at least two investigations ({sel.length}/3 selected) from the console, the explorer, or a suggestion above.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
          <div className="glass hud rounded-xl p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              {sel.map((s, k) => (
                <button key={s.id} onClick={() => toggle(s.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink" title="Remove">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />
                  {s.acronym} ✕
                </button>
              ))}
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="rgba(148,178,255,0.15)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "#a7b3cf", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {sel.map((s, k) => (
                    <Radar key={s.id} name={s.acronym} dataKey={s.id} stroke={COLORS[k]} fill={COLORS[k]} fillOpacity={0.15} strokeWidth={2} isAnimationActive />
                  ))}
                  <Tooltip contentStyle={{ background: "#0a1020", border: "1px solid rgba(148,178,255,0.2)", borderRadius: 12, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass hud min-w-0 overflow-hidden rounded-xl">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-32 p-4 font-medium text-ink-3"></th>
                    {sel.map((s, k) => (
                      <th key={s.id} className="p-4">
                        <button onClick={() => onOpen(s.id)} className="text-sm font-semibold hover:underline" style={{ color: COLORS[k] }}>
                          {s.acronym}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([l, f]) => {
                    const vals = sel.map(f);
                    const same = vals.every((v) => v === vals[0]);
                    return (
                      <tr key={l} className="border-b border-line/60 align-top">
                        <td className="p-4 text-ink-3">
                          {l}
                          {same && <span className="ml-1 rounded bg-green/15 px-1 text-[0.6rem] text-green">same</span>}
                        </td>
                        {vals.map((v, k) => (
                          <td key={k} className={`p-4 leading-relaxed ${same ? "text-ink-3" : "text-ink-2"}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass hud overflow-hidden rounded-xl lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-amber/10 to-transparent p-5">
              <div className="text-sm font-semibold">✦ AI comparison for {label}</div>
              <button
                onClick={() => ai.run({ mode: "compare", ids, conditions: { ...cond, label } })}
                disabled={ai.loading}
                className="rounded-full bg-amber px-5 py-2 text-sm font-semibold text-bg transition hover:bg-white disabled:opacity-60"
              >
                {ai.loading ? "Comparing…" : ai.text ? "Re-run" : "Explain the differences"}
              </button>
            </div>
            <div className="p-6">
              {ai.text ? <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} /> : <p className="text-sm text-ink-3">Shared methods, how conditions differ, what each contributes, and a one-line verdict.</p>}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
