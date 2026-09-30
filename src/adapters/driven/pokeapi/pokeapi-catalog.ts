import { z } from "zod";
import { NotFound, UpstreamError } from "@/core/application/errors";
import type { PokemonCatalog } from "@/core/application/ports";
import type { BaseStats, Move, Pokemon, PokemonDetails, PokemonSummary } from "@/core/domain/pokemon/pokemon";

const API = "https://pokeapi.co/api/v2";
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const spriteUrl = (id: number | string) => `${SPRITES}/${id}.png`;

// the id is only in the url on list/species endpoints: .../pokemon/25/
const idFromUrl = (url: string) => Number(url.split("/").filter(Boolean).pop());

// only parse what we use. pokeapi payloads are huge + we don't trust them blindly
const Named = z.object({ name: z.string(), url: z.string() });

const ListSchema = z.object({ results: z.array(Named) });

const PokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  sprites: z.object({ front_default: z.string().nullable() }),
  types: z.array(z.object({ slot: z.number(), type: Named })),
  abilities: z.array(z.object({ ability: Named, is_hidden: z.boolean() })),
  stats: z.array(z.object({ base_stat: z.number(), stat: Named })),
  moves: z.array(z.object({ move: Named })),
  species: Named,
});

const SpeciesSchema = z.object({
  flavor_text_entries: z.array(z.object({ flavor_text: z.string(), language: Named })),
  evolution_chain: z.object({ url: z.string() }).nullable(),
});

type ChainLink = { species: z.infer<typeof Named>; evolves_to: ChainLink[] };
const ChainLinkSchema: z.ZodType<ChainLink> = z.lazy(() =>
  z.object({ species: Named, evolves_to: z.array(ChainLinkSchema) }),
);
const EvolutionSchema = z.object({ chain: ChainLinkSchema });

const MoveSchema = z.object({ name: z.string(), power: z.number().nullable(), type: Named });

const STAT_KEYS: Record<string, keyof BaseStats> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

function toPokemon(raw: z.infer<typeof PokemonSchema>): Pokemon {
  const stats: BaseStats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
  for (const s of raw.stats) {
    const key = STAT_KEYS[s.stat.name];
    if (key) stats[key] = s.base_stat;
  }

  return {
    id: raw.id,
    name: raw.name,
    sprite: raw.sprites.front_default ?? spriteUrl(raw.id),
    types: [...raw.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    // api gives decimetres + hectograms, don't ask me why
    heightM: raw.height / 10,
    weightKg: raw.weight / 10,
    abilities: raw.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats,
    moveNames: raw.moves.map((m) => m.move.name),
  };
}

// eevee has 3 branches, the old version only followed the first one
function flattenChain(link: ChainLink): PokemonSummary[] {
  const id = idFromUrl(link.species.url);
  return [{ id, name: link.species.name, sprite: spriteUrl(id) }, ...link.evolves_to.flatMap(flattenChain)];
}

export class PokeApiCatalog implements PokemonCatalog {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly revalidateSeconds = 60 * 60 * 24,
  ) {}

  private async getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
    // gen 1 doesn't change much. cache it for a day on the next.js side
    const res = await this.fetcher(url, { next: { revalidate: this.revalidateSeconds } });
    if (res.status === 404) throw new NotFound(`nothing at ${url}`);
    if (!res.ok) throw new UpstreamError(`pokeapi said ${res.status} for ${url}`);

    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new UpstreamError(`pokeapi sent something weird for ${url}`);
    return parsed.data;
  }

  async list(limit: number): Promise<PokemonSummary[]> {
    const { results } = await this.getJson(`${API}/pokemon?limit=${limit}`, ListSchema);
    return results.map((r) => {
      const id = idFromUrl(r.url);
      return { id, name: r.name, sprite: spriteUrl(id) };
    });
  }

  async get(nameOrId: string): Promise<Pokemon> {
    const slug = encodeURIComponent(nameOrId.trim().toLowerCase());
    return toPokemon(await this.getJson(`${API}/pokemon/${slug}`, PokemonSchema));
  }

  async details(name: string): Promise<PokemonDetails> {
    const pokemon = await this.get(name);
    const species = await this.getJson(`${API}/pokemon-species/${pokemon.id}`, SpeciesSchema);
    const chain = species.evolution_chain ? await this.getJson(species.evolution_chain.url, EvolutionSchema) : null;

    const english = species.flavor_text_entries.find((e) => e.language.name === "en");
    return {
      ...pokemon,
      // the flavor text comes with \f and \n from the gameboy days
      description: english?.flavor_text.replace(/[\f\n\r]+/g, " ") ?? "No description yet.",
      evolutions: chain ? flattenChain(chain.chain) : [],
    };
  }

  async move(name: string): Promise<Move> {
    const raw = await this.getJson(`${API}/move/${encodeURIComponent(name)}`, MoveSchema);
    return { name: raw.name, type: raw.type.name, power: raw.power };
  }
}
