import type { TeamMember } from "@/core/domain/pokemon/pokemon";

// real gen 1 base stats. each case says what a correct diagnosis MUST contain.
// graded by code, not by another LLM: cheap, deterministic, no "the judge liked it" drift

const mon = (
  id: number,
  name: string,
  types: string[],
  s: [number, number, number, number, number, number],
  moves: Array<[string, string, number | null]>,
): TeamMember => ({
  id,
  name,
  sprite: `/${id}.png`,
  types,
  stats: { hp: s[0], attack: s[1], defense: s[2], specialAttack: s[3], specialDefense: s[4], speed: s[5] },
  moves: moves.map(([n, t, p]) => ({ name: n, type: t, power: p })),
});

const charizard = mon(
  6,
  "charizard",
  ["fire", "flying"],
  [78, 84, 78, 109, 85, 100],
  [
    ["flamethrower", "fire", 90],
    ["wing-attack", "flying", 60],
  ],
);
const arcanine = mon(
  59,
  "arcanine",
  ["fire"],
  [90, 110, 80, 100, 80, 95],
  [
    ["flamethrower", "fire", 90],
    ["bite", "dark", 60],
  ],
);
const rapidash = mon(
  78,
  "rapidash",
  ["fire"],
  [65, 100, 70, 80, 80, 105],
  [
    ["fire-blast", "fire", 110],
    ["stomp", "normal", 65],
  ],
);
const gyarados = mon(
  130,
  "gyarados",
  ["water", "flying"],
  [95, 125, 79, 60, 100, 81],
  [
    ["surf", "water", 90],
    ["bite", "dark", 60],
  ],
);
const lapras = mon(
  131,
  "lapras",
  ["water", "ice"],
  [130, 85, 80, 85, 95, 60],
  [
    ["ice-beam", "ice", 90],
    ["surf", "water", 90],
  ],
);
const jolteon = mon(
  135,
  "jolteon",
  ["electric"],
  [65, 65, 60, 110, 95, 130],
  [
    ["thunderbolt", "electric", 90],
    ["pin-missile", "bug", 25],
  ],
);
const snorlax = mon(
  143,
  "snorlax",
  ["normal"],
  [160, 110, 65, 65, 110, 30],
  [
    ["body-slam", "normal", 85],
    ["earthquake", "ground", 100],
  ],
);
const alakazam = mon(
  65,
  "alakazam",
  ["psychic"],
  [55, 50, 45, 135, 95, 120],
  [
    ["psychic", "psychic", 90],
    ["recover", "normal", null],
  ],
);
const golem = mon(
  76,
  "golem",
  ["rock", "ground"],
  [80, 120, 130, 55, 65, 45],
  [
    ["earthquake", "ground", 100],
    ["rock-slide", "rock", 75],
  ],
);
const exeggutor = mon(
  103,
  "exeggutor",
  ["grass", "psychic"],
  [95, 95, 85, 125, 75, 55],
  [
    ["solar-beam", "grass", 120],
    ["psychic", "psychic", 90],
  ],
);
const magikarp = mon(
  129,
  "magikarp",
  ["water"],
  [20, 10, 55, 15, 20, 80],
  [
    ["splash", "normal", null],
    ["tackle", "normal", 40],
  ],
);

export interface EvalCase {
  id: string;
  team: TeamMember[];
  verdictIn: Array<"ready" | "risky" | "weak">;
  // at least 1 of these must show up in threats
  threatsAnyOf?: string[];
  // none of these may show up (they're resisted, calling them a threat = wrong)
  threatsNoneOf?: string[];
}

export const CASES: EvalCase[] = [
  {
    id: "mono-fire",
    team: [charizard, arcanine, rapidash],
    verdictIn: ["risky", "weak"],
    threatsAnyOf: ["water", "rock", "ground"],
    threatsNoneOf: ["grass", "bug"],
  },
  { id: "lonely-magikarp", team: [magikarp], verdictIn: ["weak"] },
  {
    id: "balanced-six",
    team: [gyarados, jolteon, snorlax, alakazam, golem, exeggutor],
    verdictIn: ["ready", "risky"],
    threatsNoneOf: ["normal", "poison"],
  },
  {
    id: "double-water",
    team: [gyarados, lapras, magikarp],
    verdictIn: ["risky", "weak"],
    threatsAnyOf: ["electric"],
    threatsNoneOf: ["fire", "water"],
  },
  {
    id: "rock-ground-duo",
    team: [golem, snorlax],
    verdictIn: ["weak", "risky"],
    threatsAnyOf: ["water", "grass", "fighting", "ice"],
    threatsNoneOf: ["electric", "poison"],
  },
];
