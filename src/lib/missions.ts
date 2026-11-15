export interface Mission {
  id: string;
  name: string;
  short: string;
  o2: number; // vol %
  pressure: number; // kPa
  flow: number; // cm/s cabin ventilation
  gravity: number; // in g
  note: string;
  emoji: string;
}

export const missions: Mission[] = [
  {
    id: "iss",
    name: "International Space Station",
    short: "ISS",
    o2: 21,
    pressure: 101.3,
    flow: 15,
    gravity: 0,
    note: "Sea-level-like air at 14.7 psi. Fans provide the only airflow in microgravity.",
    emoji: "🛰️",
  },
  {
    id: "moon-base",
    name: "Artemis Moon Base",
    short: "Moon Base",
    o2: 30,
    pressure: 70.3,
    flow: 10,
    gravity: 0.166,
    note: "Expected ≥30% O₂ at ≤10.2 psi to shorten EVA pre-breathe. That's over 40% more oxygen than Earth air.",
    emoji: "🌕",
  },
  {
    id: "rover",
    name: "Pressurized Lunar Rover",
    short: "Rover",
    o2: 34,
    pressure: 56.5,
    flow: 15,
    gravity: 0.166,
    note: "Exploration atmosphere ~34% O₂ at 8.2 psi so crew can egress quickly.",
    emoji: "🚙",
  },
  {
    id: "mars",
    name: "Mars Surface Habitat",
    short: "Mars",
    o2: 30,
    pressure: 70.3,
    flow: 10,
    gravity: 0.38,
    note: "Likely similar exploration atmosphere to the Moon Base, under 0.38 g.",
    emoji: "🔴",
  },
  {
    id: "suit",
    name: "Spacesuit / Pre-breathe",
    short: "Spacesuit",
    o2: 100,
    pressure: 29.6,
    flow: 5,
    gravity: 0,
    note: "100% O₂ at 4.3 psi. The most oxygen-rich environment a crew member experiences.",
    emoji: "🧑‍🚀",
  },
  {
    id: "earth",
    name: "Earth Reference",
    short: "Earth",
    o2: 21,
    pressure: 101.3,
    flow: 0,
    gravity: 1,
    note: "Buoyancy drives hot gases upward and makes the classic teardrop flame.",
    emoji: "🌍",
  },
];

export const missionById = (id: string) => missions.find((m) => m.id === id) ?? missions[1];

/**
 * Heuristic relative flammability index vs. ISS air (=1.0). Oxygen concentration
 * dominates solid-material flammability; partial pressure of O₂ has a weaker
 * effect. Illustrative only, not a certified model.
 */
export function flammabilityIndex(o2: number, pressure: number) {
  return Math.pow(o2 / 21, 1.6) * Math.pow(pressure / 101.3, 0.2);
}
