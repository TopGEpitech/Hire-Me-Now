import type { BaseStats, Move, TeamMember } from "@/core/domain/pokemon/pokemon";

const flat = (n: number): BaseStats => ({
  hp: n,
  attack: n,
  defense: n,
  specialAttack: n,
  specialDefense: n,
  speed: n,
});

export const move = (name: string, type: string, power: number | null = 60): Move => ({ name, type, power });

let nextId = 1;

export function member(name: string, types: string[], over: Partial<BaseStats> = {}, moves?: Move[]): TeamMember {
  return {
    id: nextId++,
    name,
    sprite: `/${name}.png`,
    types,
    stats: { ...flat(80), ...over },
    moves: moves ?? [move("tackle", "normal", 40)],
  };
}

// replays the same numbers over + over. makes the "random" parts predictable
export const sequence =
  (...values: number[]) =>
  () => {
    const v = values.shift() ?? 0.5;
    values.push(v);
    return v;
  };
