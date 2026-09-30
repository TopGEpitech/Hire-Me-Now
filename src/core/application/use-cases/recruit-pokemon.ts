import {
  GEN_ONE_COUNT,
  MAX_TEAM_SIZE,
  MOVES_PER_POKEMON,
  type Move,
  type TeamMember,
} from "../../domain/pokemon/pokemon";
import type { PokemonCatalog, Random } from "../ports";

// what the games do when a pokemon has nothing else to use
const STRUGGLE: Move = { name: "struggle", type: "normal", power: 50 };

// fisher-yates. the old code did .sort(() => 0.5 - Math.random()) which is biased
// and it also mutated the array coming from the api. oops
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function recruitPokemon(deps: { catalog: PokemonCatalog; random: Random }) {
  return async (nameOrId: string): Promise<TeamMember> => {
    const pokemon = await deps.catalog.get(nameOrId);
    const picked = shuffle(pokemon.moveNames, deps.random).slice(0, MOVES_PER_POKEMON);
    const moves = await Promise.all(picked.map((name) => deps.catalog.move(name)));

    return {
      id: pokemon.id,
      name: pokemon.name,
      sprite: pokemon.sprite,
      types: pokemon.types,
      stats: pokemon.stats,
      moves: moves.length ? moves : [STRUGGLE],
    };
  };
}

export function pickRivalTeam(deps: { recruit: (id: string) => Promise<TeamMember>; random: Random }) {
  return async (size = MAX_TEAM_SIZE) => {
    const ids = shuffle(
      Array.from({ length: GEN_ONE_COUNT }, (_, i) => i + 1),
      deps.random,
    ).slice(0, size);
    return Promise.all(ids.map((id) => deps.recruit(String(id))));
  };
}
