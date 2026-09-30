import { ApiPokemonCatalog } from "@/adapters/driven/api-client/api-pokemon-catalog";
import { LocalTeamStore } from "@/adapters/driven/storage/local-team-store";
import { pickRivalTeam, recruitPokemon } from "@/core/application/use-cases/recruit-pokemon";

// same idea as composition/server.ts but for the browser side

export const catalog = new ApiPokemonCatalog();
export const teamStore = new LocalTeamStore();
export const recruit = recruitPokemon({ catalog, random: Math.random });
export const pickRival = pickRivalTeam({ recruit, random: Math.random });
