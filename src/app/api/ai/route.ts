import { NextRequest } from "next/server";
import { investigations as local, type Investigation } from "@/data/investigations";
import { getInvestigations, supabase } from "@/lib/data";
import { rank, insights } from "@/lib/scoring";
import { flammabilityIndex } from "@/lib/missions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "ask" | "briefing" | "interpret" | "compare";
interface Body {
  mode: Mode;
  question?: string;
  ids?: string[];
  conditions: { o2: number; pressure: number; flow: number; gravity: number; label?: string };
  history?: { role: "user" | "model"; text: string }[];
}

const SYSTEM = `You are FlameScope, a fire-safety science analyst for NASA human exploration.
You interpret NASA Physical Sciences Informatics (PSI) microgravity combustion investigations.
Rules:
- Ground every claim in the DATASET provided. Cite investigations inline as [ACRONYM].
- If the dataset does not contain the answer, say so plainly and suggest which PSI investigation or future experiment (e.g. LUCI, FM2) would.
- Be concise, technical but readable for grad students and aerospace engineers. Use short markdown sections and bullet points. No more than ~220 words unless asked.
- Organise advice by Prevention / Detection / Suppression when relevant.
- Values marked "approximate" are envelopes; mention uncertainty where it matters.
- Never invent numeric results that are not in the dataset.`;

function compact(list: Investigation[]) {
  return list.map((i) => ({
    acronym: i.acronym,
    name: i.name,
    hardware: i.hardware,
    years: i.years,
    fuelType: i.fuelType,
    fuels: i.fuels,
    geometry: i.sampleGeometry,
    o2_pct: i.o2,
    pressure_kPa: i.pressure,
    flow_cm_s: i.flow,
    diluents: i.diluents,
    sensors: i.sensors,
    objective: i.objective,
    variables: i.variables,
    findings: i.findings,
    categories: i.categories,
    habitatNote: i.habitatNote,
    earth: i.earthApplication,
    confidence: i.dataConfidence,
  }));
}

function buildPrompt(b: Body, list: Investigation[]) {
  const c = b.conditions;
  const ranked = rank(list, c).slice(0, 8).map((r) => `${r.inv.acronym} (${r.score})`).join(", ");
  const ctx = `MISSION CONDITIONS: ${c.label ?? "custom"}: O₂ ${c.o2}%, pressure ${c.pressure} kPa, airflow ${c.flow} cm/s, gravity ${c.gravity} g. Heuristic flammability index vs ISS: ${flammabilityIndex(c.o2, c.pressure).toFixed(2)}×.
TOP-RANKED (FlameScope relevance score): ${ranked}
AUTO INSIGHTS: ${insights(list, c).map((i) => i.text).join(" | ")}`;
  const sel = b.ids?.length ? list.filter((i) => b.ids!.includes(i.id)) : [];
  switch (b.mode) {
    case "briefing":
      return `${ctx}\n\nWrite a crisp MISSION FIRE-SAFETY BRIEFING for these conditions: 1) headline risk in one sentence, 2) the 3 most relevant investigations and what each tells us, 3) Prevention / Detection / Suppression recommendations, 4) the biggest data gap.`;
    case "interpret":
      return `${ctx}\n\nFOCUS INVESTIGATION: ${JSON.stringify(compact(sel))}\n\nExplain in plain terms what this investigation tells crews and engineers about fire safety under the mission conditions above, how far the data can be extrapolated, and one concrete design implication.`;
    case "compare":
      return `${ctx}\n\nCOMPARE: ${JSON.stringify(compact(sel))}\n\nCompare these investigations: shared hardware or methods, how test conditions and variables differ, what each uniquely contributes to fire safety, and which is most useful for the mission above. End with a one-line verdict.`;
    default:
      return `${ctx}\n\nQUESTION: ${b.question}`;
  }
}

function offlineAnswer(b: Body, list: Investigation[]) {
  const c = b.conditions;
  const top = rank(list, c).slice(0, 3);
  const ins = insights(list, c);
  return `> ⚠️ AI model not configured (set \`GEMINI_API_KEY\`). Showing a data-driven summary instead.\n\n**Most relevant for ${c.label ?? "these conditions"}:**\n${top
    .map((r) => `- **[${r.inv.acronym}]** (score ${r.score}): ${r.inv.habitatNote}`)
    .join("\n")}\n\n**Insights:**\n${ins.map((i) => `- ${i.text}`).join("\n")}`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (body.question && body.question.length > 1000) return new Response("Question too long", { status: 400 });

  const { data: list } = await getInvestigations().catch(() => ({ data: local }));
  const prompt = buildPrompt(body, list);

  if (body.mode === "ask" && body.question && supabase) {
    supabase
      .from("questions")
      .insert({ question: body.question, mission: body.conditions.label ?? null })
      .then(() => {}, () => {});
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response(offlineAnswer(body, list), { headers: { "content-type": "text/plain; charset=utf-8" } });

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const contents = [
    ...(body.history ?? []).slice(-6).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM}\n\nDATASET (NASA PSI combustion investigations):\n${JSON.stringify(compact(list))}` }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
      }),
    },
  ).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    const detail = upstream ? await upstream.text().catch(() => "") : "network error";
    console.error("Gemini error", upstream?.status, detail.slice(0, 400));
    return new Response(`${offlineAnswer(body, list)}\n\n_(AI service error ${upstream?.status ?? ""})_`, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const json = JSON.parse(line.slice(5).trim());
              const parts = json?.candidates?.[0]?.content?.parts ?? [];
              for (const p of parts) if (p.text && !p.thought) controller.enqueue(encoder.encode(p.text));
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
