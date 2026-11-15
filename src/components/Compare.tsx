"use client";

import { ArrowLeftRight, Sparkles, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Investigation } from "@/data/investigations";
import type { Conditions } from "@/lib/scoring";
import { scoreInvestigation } from "@/lib/scoring";
import { AIText, useAI } from "./ai";
import { Btn, FUEL_META } from "./ui";

const COLORS = ["#1f5cff", "#ff6a2b", "#12b886"];

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
    { k: "O₂ range", f: (i: Investigation) => Math.min(1, (i.o2[1] - i.o2[0] + 2) / 40) },
    { k: "Pressure range", f: (i: Investigation) => Math.min(1, (i.pressure[1] - i.pressure[0] + 10) / 200) },
    { k: "Airflow range", f: (i: Investigation) => Math.min(1, (i.flow[1] - i.flow[0] + 2) / 50) },
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
    ["Large vs small solids", ["saffire-1", "bass-ii"]],
    ["Smoke vs dust", ["same-r", "daft"]],
    ["Droplet suppression", ["flex", "flex-2", "cfi"]],
  ];

  const apply = (s: string[]) => {
    ids.forEach((id) => !s.includes(id) && toggle(id));
    s.forEach((id) => !ids.includes(id) && toggle(id));
    ai.setText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sel.map((s, k) => (
          <button key={s.id} onClick={() => toggle(s.id)} className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-3 pr-2 text-[0.85rem] font-semibold ring-1 ring-line hover:ring-ink" title="Remove">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k] }} />
            {s.acronym}
            <X size={14} className="text-ink-3" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <span className="text-[0.8rem] text-ink-3">Try:</span>
        {suggestions.map(([l, s]) => (
          <button key={l} onClick={() => apply(s)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-medium text-ink-2 ring-1 ring-line transition hover:bg-white hover:text-ink">
            <ArrowLeftRight size={13} /> {l}
          </button>
        ))}
      </div>

      {sel.length < 2 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-paper px-6 py-16 text-center">
          <ArrowLeftRight size={28} className="text-ink-3" />
          <p className="mt-3 max-w-sm text-[0.92rem] text-ink-2">Pick at least two experiments in step 3 (you have {sel.length} of 3), or try one of the pairings above.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
            <div className="rounded-3xl bg-paper p-4">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="70%">
                    <PolarGrid stroke="#d3d8e3" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "#4a5268", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {sel.map((s, k) => (
                      <Radar key={s.id} name={s.acronym} dataKey={s.id} stroke={COLORS[k]} fill={COLORS[k]} fillOpacity={0.14} strokeWidth={2} />
                    ))}
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e3e6ee", borderRadius: 14, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="scrollbar-thin min-w-0 overflow-x-auto rounded-3xl bg-paper">
              <table className="w-full min-w-[560px] text-left text-[0.82rem]">
                <thead>
                  <tr>
                    <th className="w-32 p-4" />
                    {sel.map((s, k) => (
                      <th key={s.id} className="p-4">
                        <button onClick={() => onOpen(s.id)} className="display text-[1.05rem] font-semibold hover:underline" style={{ color: COLORS[k] }}>
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
                      <tr key={l} className="border-t border-line align-top">
                        <td className="p-4 font-medium text-ink-3">
                          {l}
                          {same && <span className="ml-1.5 rounded-full bg-go-soft px-1.5 py-px text-[0.68rem] font-semibold text-go">same</span>}
                        </td>
                        {vals.map((v, k) => (
                          <td key={k} className={`p-4 leading-relaxed ${same ? "text-ink-3" : "text-ink"}`}>
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
          <div className="rounded-3xl bg-paper p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">AI comparison for {label}</div>
                <div className="text-[0.85rem] text-ink-3">Shared methods, how the conditions differ, what each adds, and a verdict.</div>
              </div>
              <Btn variant="blue" disabled={ai.loading} onClick={() => ai.run({ mode: "compare", ids, conditions: { ...cond, label } })}>
                <Sparkles size={15} /> {ai.loading ? "Comparing…" : ai.text ? "Run again" : "Explain the differences"}
              </Btn>
            </div>
            {ai.text && (
              <div className="mt-4 rounded-2xl bg-white p-5">
                <AIText text={ai.text} loading={ai.loading} investigations={investigations} onCite={onOpen} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
