import { describe, expect, it } from "vitest";
import { NotFound, UpstreamError } from "@/core/application/errors";
import { PokeApiCatalog } from "./pokeapi-catalog";

const named = (name: string, url = `https://pokeapi.co/api/v2/x/${name}/`) => ({ name, url });

const EEVEE = {
  id: 133,
  name: "eevee",
  height: 3,
  weight: 65,
  sprites: { front_default: null },
  types: [{ slot: 1, type: named("normal") }],
  abilities: [{ ability: named("run-away"), is_hidden: false }],
  stats: [
    { base_stat: 55, stat: named("hp") },
    { base_stat: 55, stat: named("attack") },
    { base_stat: 50, stat: named("defense") },
    { base_stat: 45, stat: named("special-attack") },
    { base_stat: 65, stat: named("special-defense") },
    { base_stat: 55, stat: named("speed") },
  ],
  moves: [{ move: named("tackle") }],
  species: named("eevee"),
};

const species = (id: string) => ({ name: `s${id}`, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` });

const ROUTES: Record<string, unknown> = {
  "/pokemon/eevee": EEVEE,
  "/pokemon-species/133": {
    flavor_text_entries: [
      { flavor_text: "Ça évolue", language: named("fr") },
      { flavor_text: "Its genetic code\fis irregular.\nIt may mutate", language: named("en") },
    ],
    evolution_chain: { url: "https://pokeapi.co/api/v2/evolution-chain/67/" },
  },
  "/evolution-chain/67": {
    chain: {
      species: species("133"),
      evolves_to: [
        { species: species("134"), evolves_to: [] },
        { species: species("135"), evolves_to: [] },
        { species: species("136"), evolves_to: [] },
      ],
    },
  },
  "/pokemon?limit=2": {
    results: [
      named("bulbasaur", "https://pokeapi.co/api/v2/pokemon/1/"),
      named("ivysaur", "https://pokeapi.co/api/v2/pokemon/2/"),
    ],
  },
  "/move/tackle": { name: "tackle", power: 40, type: named("normal") },
  "/move/weird": { name: "weird", power: "lots" },
};

const fakeFetch = (async (input: string | URL | Request) => {
  const path = String(input).replace("https://pokeapi.co/api/v2", "").replace(/\/$/, "");
  if (path === "/pokemon/down") return new Response("oops", { status: 500 });
  return path in ROUTES ? Response.json(ROUTES[path]) : new Response("nope", { status: 404 });
}) as typeof fetch;

const catalog = new PokeApiCatalog(fakeFetch);

describe("PokeApiCatalog", () => {
  it("lists with ids + sprites built from the url", async () => {
    const list = await catalog.list(2);
    expect(list.map((p) => p.id)).toEqual([1, 2]);
    expect(list[0].sprite).toMatch(/sprites\/pokemon\/1\.png$/);
  });

  it("maps a pokemon into the domain shape", async () => {
    const eevee = await catalog.get("  Eevee ");
    expect(eevee).toMatchObject({ id: 133, heightM: 0.3, weightKg: 6.5, types: ["normal"], moveNames: ["tackle"] });
    expect(eevee.stats).toEqual({ hp: 55, attack: 55, defense: 50, specialAttack: 45, specialDefense: 65, speed: 55 });
    // no sprite in the payload -> we build one
    expect(eevee.sprite).toMatch(/133\.png$/);
  });

  it("cleans the flavor text + keeps every branch of the evolution", async () => {
    const eevee = await catalog.details("eevee");
    expect(eevee.description).toBe("Its genetic code is irregular. It may mutate");
    expect(eevee.evolutions.map((e) => e.id)).toEqual([133, 134, 135, 136]);
  });

  it("reads move type + power", async () => {
    expect(await catalog.move("tackle")).toEqual({ name: "tackle", type: "normal", power: 40 });
  });

  it("maps 404 to NotFound + the rest to UpstreamError", async () => {
    await expect(catalog.get("missingno")).rejects.toBeInstanceOf(NotFound);
    await expect(catalog.get("down")).rejects.toBeInstanceOf(UpstreamError);
    await expect(catalog.move("weird")).rejects.toBeInstanceOf(UpstreamError);
  });
});
