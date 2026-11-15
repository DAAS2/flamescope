import type { Investigation, SafetyCategory } from "@/data/investigations";

export interface Conditions {
  o2: number;
  pressure: number;
  flow: number;
  gravity: number;
}

export interface ScoreBreakdown {
  o2: number;
  pressure: number;
  flow: number;
  fuel: number;
  directness: number;
}

export interface Ranked {
  inv: Investigation;
  score: number; // 0..100
  parts: ScoreBreakdown;
  covers: boolean; // tested at (near) these O₂ AND pressure conditions
}

export const WEIGHTS = { o2: 0.3, pressure: 0.15, flow: 0.1, fuel: 0.15, directness: 0.3 } as const;

const fit = (v: number, [lo, hi]: [number, number], scale: number) =>
  v >= lo && v <= hi ? 1 : Math.exp(-Math.min(Math.abs(v - lo), Math.abs(v - hi)) / scale);

// Solids are what actually burn in a habitat (fabrics, plastics, wiring insulation).
const FUEL_RELEVANCE: Record<Investigation["fuelType"], number> = {
  solid: 1,
  aerosol: 0.85,
  liquid: 0.7,
  gas: 0.6,
};

export function scoreInvestigation(inv: Investigation, c: Conditions, focus: SafetyCategory | "all" = "all"): Ranked {
  const parts: ScoreBreakdown = {
    o2: fit(c.o2, inv.o2, 8),
    pressure: fit(c.pressure, inv.pressure, 25),
    flow: fit(c.flow, inv.flow, 15),
    fuel: FUEL_RELEVANCE[inv.fuelType],
    directness: inv.directness,
  };
  let score =
    parts.o2 * WEIGHTS.o2 +
    parts.pressure * WEIGHTS.pressure +
    parts.flow * WEIGHTS.flow +
    parts.fuel * WEIGHTS.fuel +
    parts.directness * WEIGHTS.directness;
  if (focus !== "all" && !inv.categories.includes(focus)) score *= 0.6;
  const covers = fit(c.o2, inv.o2, 1) > 0.5 && fit(c.pressure, inv.pressure, 6) > 0.5;
  return { inv, score: Math.round(score * 100), parts, covers };
}

export function rank(list: Investigation[], c: Conditions, focus: SafetyCategory | "all" = "all"): Ranked[] {
  return list.map((i) => scoreInvestigation(i, c, focus)).sort((a, b) => b.score - a.score);
}

/** Auto-generated, data-driven insights for a set of conditions. */
export function insights(list: Investigation[], c: Conditions): { tone: "warn" | "info" | "ok"; text: string }[] {
  const ranked = rank(list, c);
  const covering = ranked.filter((r) => r.covers);
  const solidCovering = covering.filter((r) => r.inv.fuelType === "solid");
  const out: { tone: "warn" | "info" | "ok"; text: string }[] = [];

  out.push({
    tone: covering.length >= 5 ? "ok" : covering.length > 0 ? "info" : "warn",
    text: `${covering.length} of ${list.length} investigations tested at roughly ${c.o2}% O₂ and ${Math.round(c.pressure)} kPa${covering.length ? `: ${covering.map((r) => r.inv.acronym).join(", ")}` : ""}.`,
  });
  if (solidCovering.length === 0 && c.o2 > 22) {
    out.push({
      tone: "warn",
      text: `Data gap: no solid-material (fabric/plastic) microgravity test in PSI covers ${c.o2}% O₂. Habitat materials at this atmosphere are extrapolated from 1-g or ≤21% O₂ µg data.`,
    });
  }
  if (c.gravity > 0 && c.gravity < 1) {
    out.push({
      tone: "warn",
      text: `Partial gravity (${c.gravity.toFixed(2)} g): PSI has no partial-g combustion data yet. Results are bounded by µg and 1-g tests. E-FIELD Flames is the only partial-g proxy.`,
    });
  }
  if (c.flow <= 5) {
    out.push({
      tone: "info",
      text: "Low ventilation: BASS-II and Saffire-III show flames can survive at very low flow speeds, so turning fans off slows a fire but may not stop it.",
    });
  }
  if (c.o2 >= 40) {
    out.push({
      tone: "warn",
      text: "Very high O₂: only CFI-G (up to 85% O₂) reaches this regime. Almost every material is flammable here.",
    });
  }
  return out;
}
