import type { Move, TeamMember } from "../pokemon/pokemon";
import { isSpecial, typeMultiplier } from "./type-chart";

export const LEVEL = 50;
const FALLBACK_POWER = 40;
const STAB = 1.5;

export type Side = "player" | "ai";
// anything that returns [0, 1). Math.random in prod, a fixed list in tests
export type Random = () => number;

export interface Fighter extends TeamMember {
  maxHp: number;
  hp: number;
}

export type BattleEvent =
  | { kind: "attack"; side: Side; pokemon: string; move: Move; damage: number; multiplier: number }
  | { kind: "faint"; side: Side; pokemon: string }
  | { kind: "send-out"; side: Side; pokemon: string }
  | { kind: "win"; side: Side };

export interface Battle {
  player: Fighter[];
  ai: Fighter[];
  turn: number;
  log: BattleEvent[];
  winner: Side | null;
}

// real formulas at lvl 50 with no IVs/EVs. close enough to feel right
export const hpAtLevel = (base: number) => Math.floor((2 * base * LEVEL) / 100) + LEVEL + 10;
export const statAtLevel = (base: number) => Math.floor((2 * base * LEVEL) / 100) + 5;

export function toFighter(member: TeamMember): Fighter {
  const maxHp = hpAtLevel(member.stats.hp);
  return { ...member, maxHp, hp: maxHp };
}

export function computeHit(attacker: TeamMember, defender: TeamMember, move: Move, roll = 1) {
  const multiplier = typeMultiplier(move.type, defender.types);
  if (multiplier === 0) return { damage: 0, multiplier };

  const special = isSpecial(move.type);
  const atk = statAtLevel(special ? attacker.stats.specialAttack : attacker.stats.attack);
  const def = statAtLevel(special ? defender.stats.specialDefense : defender.stats.defense);
  const power = move.power ?? FALLBACK_POWER;
  const stab = attacker.types.includes(move.type) ? STAB : 1;

  const base = Math.floor(Math.floor((Math.floor((2 * LEVEL) / 5 + 2) * power * atk) / def) / 50) + 2;
  return { damage: Math.max(1, Math.floor(base * stab * multiplier * roll)), multiplier };
}

export const activeFighter = (team: Fighter[]) => team.find((f) => f.hp > 0);
const other = (side: Side): Side => (side === "player" ? "ai" : "player");

export function startBattle(player: TeamMember[], ai: TeamMember[]): Battle {
  if (!player.length || !ai.length) throw new Error("both sides need at least 1 pokemon");
  return { player: player.map(toFighter), ai: ai.map(toFighter), turn: 0, log: [], winner: null };
}

export function chooseAiMove(attacker: Fighter, defender: Fighter, random: Random = Math.random, smart = true) {
  // the old AI, kept behind the "smart-ai" flag so i can roll the new one out slowly
  if (!smart) return Math.floor(random() * attacker.moves.length);
  // 1 time out of 5 it goes random so it doesn't feel like a calculator
  if (random() < 0.2) return Math.floor(random() * attacker.moves.length);

  let best = 0;
  let bestDamage = -1;
  attacker.moves.forEach((move, i) => {
    const { damage } = computeHit(attacker, defender, move);
    if (damage > bestDamage) {
      best = i;
      bestDamage = damage;
    }
  });
  return best;
}

interface Action {
  side: Side;
  attacker: Fighter;
  defender: Fighter;
  move: Move;
}

// pure: same battle + same randoms in = same battle out. the ui just renders what comes back
export function playTurn(
  battle: Battle,
  playerMoveIndex: number,
  random: Random = Math.random,
  opts: { smartAi?: boolean } = {},
): Battle {
  if (battle.winner) return battle;

  const teams: Record<Side, Fighter[]> = {
    player: battle.player.map((f) => ({ ...f })),
    ai: battle.ai.map((f) => ({ ...f })),
  };
  const mine = activeFighter(teams.player);
  const theirs = activeFighter(teams.ai);
  if (!mine || !theirs) return battle;

  const myMove = mine.moves[playerMoveIndex];
  if (!myMove) throw new Error(`no move at index ${playerMoveIndex}`);
  const theirMove = theirs.moves[chooseAiMove(theirs, mine, random, opts.smartAi ?? true)];

  const iGoFirst = mine.stats.speed === theirs.stats.speed ? random() < 0.5 : mine.stats.speed > theirs.stats.speed;
  const me: Action = { side: "player", attacker: mine, defender: theirs, move: myMove };
  const them: Action = { side: "ai", attacker: theirs, defender: mine, move: theirMove };

  const events: BattleEvent[] = [];
  for (const { side, attacker, defender, move } of iGoFirst ? [me, them] : [them, me]) {
    const { damage, multiplier } = computeHit(attacker, defender, move, 0.85 + random() * 0.15);
    defender.hp = Math.max(0, defender.hp - damage);
    events.push({ kind: "attack", side, pokemon: attacker.name, move, damage, multiplier });

    if (defender.hp === 0) {
      const loser = other(side);
      events.push({ kind: "faint", side: loser, pokemon: defender.name });
      const next = activeFighter(teams[loser]);
      if (next) events.push({ kind: "send-out", side: loser, pokemon: next.name });
      // a KO ends the turn. the fresh pokemon doesn't eat a free hit
      break;
    }
  }

  const winner: Side | null = !activeFighter(teams.ai) ? "player" : !activeFighter(teams.player) ? "ai" : null;
  if (winner) events.push({ kind: "win", side: winner });

  return { ...teams, turn: battle.turn + 1, log: [...battle.log, ...events], winner };
}
