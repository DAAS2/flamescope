# FlameScope: AI-powered fire safety insights from microgravity combustion

**NASA Space Apps Challenge 2026 · "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data"**

FlameScope is an interactive, AI-powered web dashboard. It **summarizes, ranks and interprets** NASA Physical Sciences Informatics (PSI) combustion investigations to deliver fire safety insights for human exploration: spacecraft, the ISS, the Artemis Moon Base, pressurized rovers and Mars habitats.

**Live demo:** _add your Vercel URL here_ · **Built for:** researchers and engineers designing fire safety for crewed habitats

### In 30 seconds
1. Pick a destination (ISS, Moon Base, rover, Mars, spacesuit) in the 3D hero. The whole app switches to that atmosphere.
2. Scroll the Oxygen Ascent to see which experiments actually tested your oxygen level, and where nothing has.
3. Re-run any of the 20 experiments live in the Simulator, inside the ranges NASA tested.
4. Open Mission Control for a ranked evidence list, a draggable O₂ × pressure data map and a Gemini-written fire safety briefing that cites its sources.

## The problem
Fires in space have killed crews (Apollo 1), threatened missions (Apollo 13, Mir), and as recently as Artemis II a smoke alarm sounded about 80,000 miles from home. In microgravity, flames lose buoyancy and become dim blue spheres, so Earth-based fire safety intuition no longer holds. NASA has decades of ISS combustion data in PSI, but it is hard to find, compare and interpret. Meanwhile the Moon Base is expected to run at **≥30% O₂ and ≤10.2 psi**, more than 40% more oxygen than Earth air, which makes materials far more flammable.

## What FlameScope does
| Challenge objective | FlameScope feature |
|---|---|
| Identify investigations most relevant to crew habitats | **Mission Control**: pick ISS, Moon Base, Rover, Mars, Spacesuit or a custom atmosphere (O₂, pressure, airflow, gravity). All 20 investigations re-rank live with a transparent relevance score and a per-factor breakdown bar. |
| Extract data for predictive modelling of flammability | **Flammability Envelope**: an O₂ × pressure map of every investigation's tested range, with habitat atmospheres and the *Exploration Atmosphere Zone* overlaid. It shows exactly where data exists, and that **no solid-material µg data covers Moon/rover atmospheres**. |
| Highlight research for next-gen fire safety controls | Every investigation is tagged **Prevention / Detection / Suppression**, with auto-generated, data-driven insights (coverage, data gaps, ventilation, partial-g warnings). |
| Summarize objectives, fuels, geometry, conditions, variables, sensors | The **Simulator** experiment picker plus an investigation **dossier** showing objective, fuels, sample geometry, O₂, pressure, flow, diluents, sensors, what varied between tests, findings and an Earth application. |
| Similarities & differences between investigations | **Compare**: up to 3 side by side, a radar chart, a table that flags fields that are "same" (e.g. shared MSG flow duct or CIR hardware), and an AI comparison. |
| "SI-powered" | **Google Gemini** (`gemini-3.6-flash`) powers a Mission Fire-Safety Briefing, per-investigation interpretation, AI comparison and an **Ask FlameScope** chat. Every answer is grounded in the dataset and cites investigations as clickable chips. |
| Partial gravity (Moon/Mars) | **Gravity Gap** panel: µg ↔ Moon ↔ Mars ↔ Earth, flagging that PSI has no partial-g data, with E-FIELD Flames as the only proxy and LUCI/FM2 as future data. |
| Applications on Earth | **Back on Earth**: water mist, smoke/dust detectors, firefighter air tanks and attire, each linked to the related PSI data. |
| Brief considerations | Shared hardware (ACME/CIR, MDCA, MSG/SPICE duct) is flagged as "same" in Compare. DAFT/SAME instrument reuse, BRE, CFI-G up to 85% O₂, the spacesuit (100% O₂, 4.3 psi) and Moon Base (≥30% O₂, ≤10.2 psi) atmospheres are all built in as presets or dataset fields. |

### Experience highlights
- **3D Mission Space (hero):** a real-time three.js scene with procedural Earth (clouds, atmosphere, city lights), Moon, Mars, Sun, a modelled **ISS**, a **lunar base with pressurized rover** and a **Mars habitat**. Click any destination and the camera flies there and sets the mission atmosphere for the whole app. A live flame model opens on demand.
- **The Oxygen Ascent:** a pinned, scroll-driven coverage chart from 12% to 100% O₂. Each row is the O₂ range one investigation tested. A marker sweeps across as you scroll, rows light up when they cover your oxygen level, and habitat atmospheres are pinned on the axis, so the data gaps where crews will live are obvious.
- **Experiment Simulator:** each of the 20 PSI investigations re-runs as a live simulation (flame spread over solids, droplet d²-law burning and cool flames, spherical burners, co-flow jets with the E-FIELD partial-gravity proxy, smoke transport to detectors). Each slider shows the range NASA actually tested, and the app flags when you are extrapolating.
- **Mission Control:** a guided four-step flow: choose a destination, check the **draggable** O₂ × pressure data map, rank the evidence and generate an AI briefing, then compare investigations (radar plus table) or ask the AI analyst.
- **Gravity Gap (3D):** an interactive WebGL scene with the ISS, Moon, Mars and Earth and a shader-driven flame that morphs from a blue microgravity sphere to a yellow 1 g teardrop. It shows where combustion data exists and where it does not.
- **Investigation dossier:** a modal with a live replay of the experiment, tested ranges plotted against your mission, a score breakdown, findings and an AI interpretation.
- Clean light design system (Funnel Display and Public Sans, sentence-case type, pill controls, custom components) with Lenis smooth scrolling.

## Investigations covered (20)
ACME (BRE, CFI-G, E-FIELD Flames, CLD Flame, Flame Design, s-Flame) · MDCA droplets (FLEX, FLEX-2, CFI) · MSG / SPICE flow duct (BASS, BASS-II, SPICE, SLICE) · Saffire-I, II, III · SAME, SAME-R, DAFT, DAFT-2.

## Methodology (transparent by design)
`score = 0.30·O₂fit + 0.15·Pfit + 0.10·flowfit + 0.15·fuelRelevance + 0.30·directness`
- The fit terms are 1 inside the tested range and decay exponentially outside it (O₂ scale 8%, pressure 25 kPa, flow 15 cm/s).
- Fuel relevance: solid 1.0 · aerosol 0.85 · liquid 0.7 · gas 0.6 (solids are what burn in habitats).
- Directness is a 0–1 rating of how directly the work informs crew-habitat fire safety, taken from the challenge brief.
- The flammability index `(O₂/21)^1.6·(P/101.3)^0.2` is an illustrative heuristic, not a certified model.
- Condition ranges are envelopes summarised from public PSI/NASA descriptions and flagged *approximate* where not taken from exact test matrices.

## Tech stack
- **Next.js 15.5 (App Router, patched for CVE-2025-66478) + React 19 + TypeScript + Tailwind CSS v4**
- **three.js + React Three Fiber + drei** (3D scene, procedural GLSL planets), **Framer Motion**, **Lenis**, **Recharts** (radar), custom SVG envelope chart and Canvas 2D experiment simulations
- **Supabase** (Postgres): `investigations` table (read-only RLS) and `questions` log (insert-only RLS). The app falls back to the bundled dataset if Supabase is unreachable.
- **Google Gemini API** (`gemini-3.6-flash`): streamed responses via a Next.js route handler. With no key set, it degrades gracefully to a deterministic, data-driven summary.
- **Vercel** for hosting

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in Supabase URL/anon key and GEMINI_API_KEY
npm run dev
```
Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-3.6-flash`).

The database schema and seed are in `supabase/seed.sql` (generated from `src/data/investigations.ts` by `node scripts/gen-seed.mjs`).

## NASA data & resources used
- NASA Physical Sciences Informatics (PSI) Data Repository: Combustion Science
- NASA Combustion Science (Glenn Research Center) investigation pages
- *A Researcher's Guide to International Space Station Combustion Science* (NASA, 2015)
- NASA history pages: Apollo 1, Apollo 13, Fire aboard Mir
- NASA Spinoff: Fire Detector, Fireman's Air Tanks, New Technology for the Fire Attire

## Use of AI
- **In the product:** Google Gemini generates briefings, interpretations, comparisons and chat answers, grounded in the curated PSI dataset and instructed to cite sources and not invent numbers.
- **In development:** an AI coding assistant (Claude) helped plan, write code and summarise public NASA descriptions into the structured dataset. The team reviewed the outputs. No AI-generated imagery is used; all visuals are code-rendered.

## Limitations & next steps
- A curated subset of 20 investigations, with condition ranges summarised (flagged approximate). Next: ingest PSI test-matrix files directly.
- No partial-gravity combustion data exists in PSI yet. Add LUCI and FM2 when they are published.
- Validate the relevance weights with NASA fire safety researchers. Add per-test (not per-investigation) records.
- Add CSV/JSON export of the ranked investigations and condition envelopes, so engineers can feed them straight into their own flammability models.

*Not an official NASA product. Making the next giant leap a safer one.*
