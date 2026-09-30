import { describe, expect, it } from "vitest";
import { FakeCatalog, fakePokemon } from "@/test/fakes";
import { sequence } from "@/test/fixtures";
import { pickRivalTeam, recruitPokemon, shuffle } from "./recruit-pokemon";

describe("shuffle", () => {
  it("keeps every item + leaves the input alone", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, sequence(0.1, 0.7, 0.3, 0.9));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("recruitPokemon", () => {
  it("picks 4 moves + asks the catalog for each one", async () => {
    const catalog = new FakeCatalog();
    const member = await recruitPokemon({ catalog, random: Math.random })("25");

    expect(member.id).toBe(25);
    expect(member.moves).toHaveLength(4);
    expect(catalog.calls.filter((c) => c.startsWith("move:"))).toHaveLength(4);
  });

  it("falls back to struggle when there's nothing to learn", async () => {
    const catalog = new FakeCatalog();
    catalog.get = async () => fakePokemon(132, "ditto", { moveNames: [] });
    const member = await recruitPokemon({ catalog, random: Math.random })("ditto");
    expect(member.moves).toEqual([{ name: "struggle", type: "normal", power: 50 }]);
  });
});

describe("pickRivalTeam", () => {
  it("builds 6 different pokemon from gen 1", async () => {
    const seen: string[] = [];
    const team = await pickRivalTeam({
      recruit: async (id) => {
        seen.push(id);
        return { id: Number(id), name: id, sprite: "", types: [], stats: fakePokemon(1, "x").stats, moves: [] };
      },
      random: Math.random,
    })();

    expect(team).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
    expect(seen.every((id) => Number(id) >= 1 && Number(id) <= 151)).toBe(true);
  });
});
