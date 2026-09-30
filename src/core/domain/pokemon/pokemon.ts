// Plain data. No fetch, no React, no Next in here. That's the whole point of the core.

export const GEN_ONE_COUNT = 151;

export interface Move {
  name: string;
  type: string;
  // status moves (growl, tail whip...) have no power in the API
  power: number | null;
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonSummary {
  id: number;
  name: string;
  sprite: string;
}

export interface Pokemon extends PokemonSummary {
  types: string[];
  heightM: number;
  weightKg: number;
  abilities: Array<{ name: string; hidden: boolean }>;
  stats: BaseStats;
  moveNames: string[];
}

export interface PokemonDetails extends Pokemon {
  description: string;
  evolutions: PokemonSummary[];
}

// what we keep in a team slot: enough to fight without refetching anything
export interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  stats: BaseStats;
  moves: Move[];
}

export const MAX_TEAM_SIZE = 6;
export const MOVES_PER_POKEMON = 4;

export function matchesSearch(pokemon: PokemonSummary, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return pokemon.name.includes(q) || String(pokemon.id) === q.replace(/^#/, "");
}
