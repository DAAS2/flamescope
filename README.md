# 🔥 FlameScope: AI-powered fire safety insights from microgravity combustion

**NASA Space Apps Challenge 2026 · "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data"**

FlameScope is an interactive, AI-powered web dashboard. It **summarizes, ranks and interprets** NASA Physical Sciences Informatics (PSI) combustion investigations to deliver fire safety insights for human exploration: spacecraft, the ISS, the Artemis Moon Base, pressurized rovers and Mars habitats.

## The problem
Fires in space have killed crews (Apollo 1), threatened missions (Apollo 13, Mir), and as recently as Artemis II a smoke alarm sounded about 80,000 miles from home. In microgravity, flames lose buoyancy and become dim blue spheres, so Earth-based fire safety intuition no longer holds. NASA has decades of ISS combustion data in PSI, but it is hard to find, compare and interpret. Meanwhile the Moon Base is expected to run at **≥30% O₂ and ≤10.2 psi**, more than 40% more oxygen than Earth air, which makes materials far more flammable.

## What FlameScope does
| Challenge objective | FlameScope feature |
|---|---|
| Identify investigations most relevant to crew habitats | **Mission Console**: pick ISS, Moon Base, Rover, Mars, Spacesuit or a custom atmosphere (O₂, pressure, airflow, gravity). All 20 investigations re-rank live with a transparent relevance score and a per-factor breakdown bar. |
| Extract data for predictive modelling of flammability | **Flammability Envelope**: an O₂ × pressure map of every investigation's tested range, with habitat atmospheres and the *Exploration Atmosphere Zone* overlaid. It shows exactly where data exists, and that **no solid-material µg data covers Moon/rover atmospheres**. |
| Highlight research for next-gen fire safety controls | Every investigation is tagged **Prevention / Detection / Suppression**, with auto-generated, data-driven insights (coverage, data gaps, ventilation, partial-g warnings). |
| Summarize objectives, fuels, geometry, conditions, variables, sensors | **Investigation Explorer** with full-text search and filters, plus a detail drawer showing objective, fuels, sample geometry, O₂, pressure, flow, diluents, sensors, what varied between tests, findings and an Earth application. |
| Similarities & differences between investigations | **Compare**: up to 3 side by side, a radar chart, a table that flags fields that are "same" (e.g. shared MSG flow duct or CIR hardware), and an AI comparison. |
| "SI-powered" | **Google Gemini** (`gemini-3.6-flash`) powers a Mission Fire-Safety Briefing, per-investigation interpretation, AI comparison and an **Ask FlameScope** chat. Every answer is grounded in the dataset and cites investigations as clickable chips. |
| Partial gravity (Moon/Mars) | **Gravity Gap** panel: µg ↔ Moon ↔ Mars ↔ Earth, flagging that PSI has no partial-g data, with E-FIELD Flames as the only proxy and LUCI/FM2 as future data. |
| Applications on Earth | **Back on Earth**: water mist, smoke/dust detectors, firefighter air tanks and attire, each linked to the related PSI data. |

### Experience highlights
- **3D Mission Space (hero):** a real-time three.js scene with procedural Earth (clouds, atmosphere, city lights), Moon, Mars, Sun, a modelled **ISS**, a **lunar base with pressurized rover** and a **Mars habitat**. Click any destination and the camera flies there and sets the mission atmosphere for the whole app, with live flame telemetry alongside.
- **The Oxygen Ascent:** a scroll journey from 12% to 100% O₂. A sticky gauge shows the flame growing and a live flammability index; each investigation's tested O₂ range is a glowing rail that lights up as you pass through it, revealing the data gaps where crews will live.
- **Experiment Simulator:** each of the 20 PSI investigations re-runs as a live simulation (flame spread over solids, droplet d²-law burning and cool flames, spherical burners, co-flow jets with the E-FIELD partial-gravity proxy, smoke transport to detectors). Sliders mark the *tested range*, and the app flags when you are extrapolating.
- **Mission Control:** tabbed workspace with the relevance ranking, a **draggable** O₂ × pressure envelope, a radar compare view and the AI analyst.
- A Lusion-style preloader, custom cursor and Lenis smooth scrolling, in a NASA Eyes-inspired HUD design system (Exo 2 / Inter / JetBrains Mono).

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
- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4**
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

*Not an official NASA product. Making the next giant leap a safer one.*
