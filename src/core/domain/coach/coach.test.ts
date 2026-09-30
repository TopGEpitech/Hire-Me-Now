import { describe, expect, it } from "vitest";
import { member, move } from "@/test/fixtures";
import { ruleCoach, teamTelemetry } from "./coach";

const charizard = member("charizard", ["fire", "flying"], {}, [
  move("flamethrower", "fire", 90),
  move("wing", "flying", 60),
]);
const arcanine = member("arcanine", ["fire"], {}, [move("flamethrower", "fire", 90)]);
const rapidash = member("rapidash", ["fire"], {}, [move("stomp", "normal", 65)]);

describe("team telemetry", () => {
  it("counts shared weaknesses", () => {
    const t = teamTelemetry([charizard, arcanine, rapidash]);
    expect(t.weakTo.water).toBe(3);
    expect(t.weakTo.rock).toBe(3); // charizard 4x, the others 2x
  });

  it("knows what the moves cover", () => {
    const t = teamTelemetry([charizard]);
    expect(t.covers).toEqual(expect.arrayContaining(["grass", "bug", "ice", "steel", "fighting"]));
    expect(t.uncovered).toContain("water");
  });

  it("reads the battle log", () => {
    const t = teamTelemetry(
      [charizard],
      [
        { kind: "attack", side: "player", pokemon: "charizard", move: move("x", "fire"), damage: 40, multiplier: 1 },
        { kind: "attack", side: "ai", pokemon: "golem", move: move("rock-slide", "rock"), damage: 99, multiplier: 4 },
        { kind: "faint", side: "player", pokemon: "charizard" },
        { kind: "win", side: "ai" },
      ],
    );
    expect(t.battle).toEqual({
      won: false,
      damageByPokemon: { charizard: 40 },
      fainted: ["charizard"],
      superEffectiveHitsTaken: 1,
    });
  });
});

describe("rule coach", () => {
  it("flags a mono fire team as weak to water + rock and suggests a fix", () => {
    const d = ruleCoach(teamTelemetry([charizard, arcanine, rapidash]));
    expect(d.verdict).not.toBe("ready");
    expect(d.threats.map((t) => t.type)).toEqual(expect.arrayContaining(["water", "rock"]));
    expect(d.fixes.length).toBeGreaterThan(0);
  });

  it("calls a 1 pokemon team weak", () => {
    expect(ruleCoach(teamTelemetry([arcanine])).verdict).toBe("weak");
  });
});

describe("rule coach fixes", () => {
  it("suggests a type that covers several threats + isn't already on the team", () => {
    const d = ruleCoach(teamTelemetry([charizard, arcanine]));
    const fix = d.fixes.find((f) => f.startsWith("add a "))!;
    expect(fix).not.toMatch(/add a (fire|flying) type/);
    expect(fix.split("resists ")[1].split(" + ").length).toBeGreaterThanOrEqual(2);
  });
});
