import { describe, expect, it } from "vitest";
import { member, move } from "@/test/fixtures";
import { chooseAiMove, computeHit, playTurn, startBattle, toFighter } from "./engine";
import { typeMultiplier } from "./type-chart";

const never = () => 0.99; // never below 0.2, so the ai always plays its best move

describe("typeMultiplier", () => {
  it("stacks on dual types", () => {
    expect(typeMultiplier("electric", ["water", "flying"])).toBe(4);
  });

  it("returns 0 when the defender is immune", () => {
    expect(typeMultiplier("ground", ["fire", "flying"])).toBe(0);
    expect(typeMultiplier("normal", ["ghost"])).toBe(0);
  });

  it("treats a type it doesn't know as neutral", () => {
    expect(typeMultiplier("sound", ["water"])).toBe(1);
  });
});

describe("computeHit", () => {
  const target = member("target", ["normal"]);

  it("hits harder when it's super effective", () => {
    const attacker = member("a", ["fighting"]);
    const strong = computeHit(attacker, target, move("karate-chop", "fighting", 50));
    const neutral = computeHit(attacker, member("b", ["water"]), move("karate-chop", "fighting", 50));
    expect(strong.multiplier).toBe(2);
    expect(strong.damage).toBeGreaterThan(neutral.damage);
  });

  it("gives STAB to moves that match the user's type", () => {
    const thunder = move("thunderbolt", "electric", 90);
    const withStab = computeHit(member("pika", ["electric"]), target, thunder).damage;
    const without = computeHit(member("rattata", ["normal"]), target, thunder).damage;
    expect(withStab / without).toBeCloseTo(1.5, 1);
  });

  it("does 0 to an immune target", () => {
    expect(
      computeHit(member("a", ["electric"]), member("b", ["ground"]), move("thunder", "electric", 110)).damage,
    ).toBe(0);
  });

  it("does at least 1 when it lands", () => {
    const tank = member("tank", ["water", "dragon"], { specialDefense: 250 });
    expect(computeHit(member("a", ["normal"]), tank, move("ember", "fire", 1), 0.85).damage).toBe(1);
  });

  it("uses 40 power for status moves", () => {
    const attacker = member("a", ["normal"]);
    expect(computeHit(attacker, target, move("growl", "normal", null)).damage).toBe(
      computeHit(attacker, target, move("x", "normal", 40)).damage,
    );
  });
});

describe("chooseAiMove", () => {
  it("goes for the super effective move", () => {
    const charmander = toFighter(
      member("charmander", ["fire"], {}, [move("tackle", "normal", 40), move("ember", "fire", 40)]),
    );
    const bulbasaur = toFighter(member("bulbasaur", ["grass"]));
    expect(chooseAiMove(charmander, bulbasaur, never)).toBe(1);
  });
});

describe("playTurn", () => {
  const nuke = [move("hyper-beam", "normal", 250)];

  it("lets the faster one hit first", () => {
    const battle = startBattle(
      [member("fast", ["normal"], { speed: 150 })],
      [member("slow", ["normal"], { speed: 20 })],
    );
    const next = playTurn(battle, 0, never);
    expect(next.log[0]).toMatchObject({ kind: "attack", side: "player" });
    expect(next.log[1]).toMatchObject({ kind: "attack", side: "ai" });
  });

  it("ends the turn on a KO + sends out the next one", () => {
    const battle = startBattle(
      [member("mewtwo", ["psychic"], { attack: 200, speed: 200 }, nuke)],
      [member("magikarp", ["water"], { hp: 20, defense: 10 }), member("backup", ["water"])],
    );
    const next = playTurn(battle, 0, never);

    expect(next.ai[0].hp).toBe(0);
    expect(next.log.map((e) => e.kind)).toEqual(["attack", "faint", "send-out"]);
    expect(next.winner).toBeNull();
    expect(next.player[0].hp).toBe(next.player[0].maxHp);
  });

  it("calls a winner when the last one faints", () => {
    const battle = startBattle(
      [member("mewtwo", ["psychic"], { attack: 200, speed: 200 }, nuke)],
      [member("magikarp", ["water"], { hp: 20, defense: 10 })],
    );
    const next = playTurn(battle, 0, never);
    expect(next.winner).toBe("player");
    expect(next.log.at(-1)).toEqual({ kind: "win", side: "player" });
  });

  it("doesn't touch the battle you pass in", () => {
    const battle = startBattle([member("a", ["normal"])], [member("b", ["normal"])]);
    const snapshot = structuredClone(battle);
    playTurn(battle, 0, never);
    expect(battle).toEqual(snapshot);
  });

  it("does nothing once it's over", () => {
    const battle = { ...startBattle([member("a", ["normal"])], [member("b", ["normal"])]), winner: "ai" as const };
    expect(playTurn(battle, 0, never)).toBe(battle);
  });

  it("refuses a move that doesn't exist", () => {
    const battle = startBattle([member("a", ["normal"])], [member("b", ["normal"])]);
    expect(() => playTurn(battle, 3, never)).toThrow(/no move/);
  });
});
