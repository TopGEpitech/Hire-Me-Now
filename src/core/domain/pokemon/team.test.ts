import { describe, expect, it } from "vitest";
import { member } from "@/test/fixtures";
import { matchesSearch } from "./pokemon";
import { TeamRuleBroken, addToTeam, removeFromTeam } from "./team";

describe("team rules", () => {
  it("adds + removes", () => {
    const pika = member("pikachu", ["electric"]);
    const team = addToTeam([], pika);
    expect(team).toEqual([pika]);
    expect(removeFromTeam(team, pika.id)).toEqual([]);
  });

  it("stops at 6", () => {
    const full = Array.from({ length: 6 }, (_, i) => member(`p${i}`, ["normal"]));
    expect(() => addToTeam(full, member("seventh", ["normal"]))).toThrow(TeamRuleBroken);
  });

  it("says no to the same pokemon twice", () => {
    const pika = member("pikachu", ["electric"]);
    expect(() => addToTeam([pika], pika)).toThrow(/already/);
  });
});

describe("matchesSearch", () => {
  const pika = { id: 25, name: "pikachu", sprite: "" };

  it("finds by name, number or #number", () => {
    expect(matchesSearch(pika, "PIKA")).toBe(true);
    expect(matchesSearch(pika, "25")).toBe(true);
    expect(matchesSearch(pika, "#25")).toBe(true);
    expect(matchesSearch(pika, "2")).toBe(false);
    expect(matchesSearch(pika, "  ")).toBe(true);
  });
});
