import type { BattleEvent } from "@/core/domain/battle/engine";
import { titleCase } from "@/ui/format";

// domain events -> the lines you'd read in the game's text box
export function describeEvent(e: BattleEvent): string {
  const name = (side: "player" | "ai", pokemon: string) =>
    side === "ai" ? `Foe ${titleCase(pokemon)}` : titleCase(pokemon);

  switch (e.kind) {
    case "attack": {
      const line = `${name(e.side, e.pokemon)} used ${titleCase(e.move.name)}!`;
      if (e.multiplier === 0) return `${line} It doesn't affect the target...`;
      if (e.multiplier > 1) return `${line} It's super effective! (${e.damage} dmg)`;
      if (e.multiplier < 1) return `${line} It's not very effective... (${e.damage} dmg)`;
      return `${line} (${e.damage} dmg)`;
    }
    case "faint":
      return `${name(e.side, e.pokemon)} fainted!`;
    case "send-out":
      return e.side === "player" ? `Go! ${titleCase(e.pokemon)}!` : `The AI sent out ${titleCase(e.pokemon)}!`;
    case "win":
      return e.side === "player" ? "You won the battle!" : "You're out of Pokémon... you blacked out!";
  }
}
