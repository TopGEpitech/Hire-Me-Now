import type { BattleEvent } from "../battle/engine";
import { TYPE_CHART, typeMultiplier } from "../battle/type-chart";
import type { TeamMember } from "../pokemon/pokemon";

// "telemetry" = hard numbers about a team (+ its last battle if there's one).
// the AI coach reads this instead of guessing, + the rule coach below uses the same numbers

export const ALL_TYPES = Object.keys(TYPE_CHART);

export interface TeamTelemetry {
  members: Array<{ name: string; types: string[]; moveTypes: string[]; baseTotal: number }>;
  // attack type -> how many of my pokemon take 2x or more from it
  weakTo: Record<string, number>;
  // defending types my moves hit for 2x+
  covers: string[];
  // defending types none of my moves hit super effectively
  uncovered: string[];
  battle: null | {
    won: boolean | null;
    damageByPokemon: Record<string, number>;
    fainted: string[];
    superEffectiveHitsTaken: number;
  };
}

export interface Diagnosis {
  verdict: "ready" | "risky" | "weak";
  summary: string;
  threats: Array<{ type: string; why: string }>;
  fixes: string[];
  mvp: string | null;
}

export function teamTelemetry(team: TeamMember[], log: BattleEvent[] = []): TeamTelemetry {
  const weakTo: Record<string, number> = {};
  for (const attack of ALL_TYPES) {
    const n = team.filter((m) => typeMultiplier(attack, m.types) >= 2).length;
    if (n) weakTo[attack] = n;
  }

  const moveTypes = new Set(team.flatMap((m) => m.moves.filter((mv) => (mv.power ?? 0) > 0).map((mv) => mv.type)));
  const covers = ALL_TYPES.filter((def) => [...moveTypes].some((atk) => typeMultiplier(atk, [def]) >= 2));

  let battle: TeamTelemetry["battle"] = null;
  if (log.length) {
    const damageByPokemon: Record<string, number> = {};
    const fainted: string[] = [];
    let superEffectiveHitsTaken = 0;
    let won: boolean | null = null;
    for (const e of log) {
      if (e.kind === "attack" && e.side === "player")
        damageByPokemon[e.pokemon] = (damageByPokemon[e.pokemon] ?? 0) + e.damage;
      if (e.kind === "attack" && e.side === "ai" && e.multiplier > 1) superEffectiveHitsTaken++;
      if (e.kind === "faint" && e.side === "player") fainted.push(e.pokemon);
      if (e.kind === "win") won = e.side === "player";
    }
    battle = { won, damageByPokemon, fainted, superEffectiveHitsTaken };
  }

  return {
    members: team.map((m) => ({
      name: m.name,
      types: m.types,
      moveTypes: [...new Set(m.moves.map((mv) => mv.type))],
      baseTotal: Object.values(m.stats).reduce((a, b) => a + b, 0),
    })),
    weakTo,
    covers,
    uncovered: ALL_TYPES.filter((t) => !covers.includes(t)),
    battle,
  };
}

// the fallback of last resort: no network, no model, always answers. also the baseline for the evals
export function ruleCoach(t: TeamTelemetry): Diagnosis {
  const size = t.members.length;
  const threats = Object.entries(t.weakTo)
    .filter(([, n]) => n >= 2 || (size <= 2 && n >= 1))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, n]) => ({ type, why: `${n} of your ${size} pokemon take double damage from ${type}` }));

  const fixes: string[] = [];
  if (size < 6) fixes.push(`add ${6 - size} more pokemon, a full team of 6 gives you switch options`);
  if (threats[0]) {
    const answer = ALL_TYPES.find((d) => typeMultiplier(threats[0].type, [d]) <= 0.5);
    if (answer) fixes.push(`add a ${answer} type, it resists ${threats[0].type}`);
  }
  if (t.uncovered.length > ALL_TYPES.length / 2)
    fixes.push("your moves hit few types super effectively, mix up move types");

  const mvp = t.battle
    ? (Object.entries(t.battle.damageByPokemon).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
    : ([...t.members].sort((a, b) => b.baseTotal - a.baseTotal)[0]?.name ?? null);

  const verdict: Diagnosis["verdict"] = size < 3 || threats.length >= 3 ? "weak" : threats.length ? "risky" : "ready";
  const summary =
    verdict === "ready"
      ? "solid team, no big shared weakness"
      : verdict === "risky"
        ? `playable, but ${threats[0].type} moves will hurt`
        : "this team will struggle, fix the basics first";

  return { verdict, summary, threats, fixes, mvp };
}
