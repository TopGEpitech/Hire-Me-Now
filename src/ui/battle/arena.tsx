"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickRival, teamStore } from "@/composition/browser";
import { activeFighter, playTurn, startBattle, type Battle, type Fighter } from "@/core/domain/battle/engine";
import { cn } from "@/ui/cn";
import { titleCase } from "@/ui/format";
import { typeColor } from "@/ui/type-colors";
import { useFlags } from "@/ui/flags/use-flags";
import { describeEvent } from "./battle-text";

type Status = "loading" | "no-team" | "error" | "ready";

// 1 turn = a short pause so you can actually read what happened
const TURN_LOCK_MS = 700;

// pokeapi has back sprites at the same path + /back. the player's mon faces away, like the games
const backSprite = (sprite: string) => sprite.replace(/\/pokemon\/(\d+)\.png$/, "/pokemon/back/$1.png");
// behind the "shiny-sprites" flag. off by default, flip it in FEATURE_FLAGS to see it
const shiny = (sprite: string) => sprite.replace(/\/pokemon\/(back\/)?(\d+)\.png$/, "/pokemon/$1shiny/$2.png");

function HpBar({ fighter }: { fighter: Fighter }) {
  const pct = (fighter.hp / fighter.maxHp) * 100;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-amber-600">HP</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 bg-muted">
          <div
            className={cn(
              "h-full transition-[width] duration-500",
              pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="mt-0.5 text-right font-mono text-xs tabular-nums">
        {fighter.hp}/{fighter.maxHp}
      </p>
    </div>
  );
}

function TeamDots({ team }: { team: Fighter[] }) {
  return (
    <div className="flex gap-1" aria-label={`${team.filter((f) => f.hp > 0).length} left`}>
      {team.map((f) => (
        <span key={f.id} className={cn("size-2.5 rounded-full border", f.hp > 0 ? "bg-primary" : "bg-muted")} />
      ))}
    </div>
  );
}

function FighterBox({ fighter, team, label }: { fighter: Fighter; team: Fighter[]; label: string }) {
  return (
    <div className="panel w-full max-w-xs p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-extrabold capitalize">{fighter.name}</p>
        <span className="font-mono text-xs">Lv50</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="kicker">{label}</span>
        <TeamDots team={team} />
      </div>
      <div className="mt-2">
        <HpBar fighter={fighter} />
      </div>
    </div>
  );
}

export function Arena() {
  const flags = useFlags();
  const [status, setStatus] = useState<Status>("loading");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [locked, setLocked] = useState(false);
  const [turnStart, setTurnStart] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const start = useCallback(async () => {
    const team = teamStore.load();
    if (!team.length) return setStatus("no-team");
    setStatus("loading");
    try {
      setBattle(startBattle(team, await pickRival()));
      setTurnStart(0);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  const attack = (moveIndex: number) => {
    if (!battle || locked) return;
    // all the rules live in the domain. this component just renders what comes back
    setTurnStart(battle.log.length);
    setBattle(playTurn(battle, moveIndex, Math.random, { smartAi: flags["smart-ai"] }));
    setLocked(true);
    timer.current = setTimeout(() => setLocked(false), TURN_LOCK_MS);
  };

  if (status === "no-team") {
    return (
      <Centered>
        <h1 className="text-3xl font-black">No team, no battle.</h1>
        <p className="mt-2 text-muted-foreground">Go pick up to 6 first. Takes 20 seconds.</p>
        <Link
          href="/battle"
          className="mt-6 inline-block rounded-md border-2 bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard-sm"
        >
          Build a team
        </Link>
      </Centered>
    );
  }

  if (status === "error") {
    return (
      <Centered>
        <h1 className="text-3xl font-black">The AI didn&apos;t show up.</h1>
        <p className="mt-2 text-muted-foreground">Couldn&apos;t load its team from PokéAPI.</p>
        <button
          onClick={start}
          className="mt-6 rounded-md border-2 bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard-sm"
        >
          Try again
        </button>
      </Centered>
    );
  }

  if (status === "loading" || !battle) {
    return (
      <Centered>
        <Loader2 className="mx-auto size-8 animate-spin" />
        <p className="mt-3 font-mono">The AI is picking 6 random Pokémon...</p>
      </Centered>
    );
  }

  const mine = activeFighter(battle.player) ?? battle.player[battle.player.length - 1];
  const theirs = activeFighter(battle.ai) ?? battle.ai[battle.ai.length - 1];
  const lastTurn = battle.log.slice(turnStart);
  const hit = (side: "player" | "ai") => lastTurn.some((e) => e.kind === "attack" && e.side === side && e.damage > 0);
  const shake = { x: [0, -8, 8, -4, 0] };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <p className="kicker">
          Turn {battle.turn} · AI: {flags["smart-ai"] ? "smart" : "random"}
          <span className="normal-case tracking-normal"> (flag smart-ai)</span>
        </p>
        <Link href="/battle" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
          <Users className="size-4" /> Edit team
        </Link>
      </div>

      {/* the field */}
      <div className="panel relative mt-3 overflow-hidden bg-gradient-to-b from-sky-100 via-emerald-50 to-lime-100 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <FighterBox fighter={theirs} team={battle.ai} label="Foe" />
          {/* new key every turn = remount = the shake plays again */}
          <motion.img
            key={`ai-${theirs.id}-${battle.turn}`}
            src={flags["shiny-sprites"] ? shiny(theirs.sprite) : theirs.sprite}
            alt={theirs.name}
            className={cn(
              "size-28 [image-rendering:pixelated] sm:size-40",
              theirs.hp === 0 && "opacity-0 transition-opacity",
            )}
            animate={hit("player") ? shake : undefined}
            transition={{ duration: 0.35 }}
          />
        </div>
        <div className="mt-2 flex items-end justify-between gap-4">
          <motion.img
            key={`me-${mine.id}-${battle.turn}`}
            src={flags["shiny-sprites"] ? shiny(backSprite(mine.sprite)) : backSprite(mine.sprite)}
            onError={(e) => (e.currentTarget.src = mine.sprite)}
            alt={mine.name}
            className={cn(
              "size-32 [image-rendering:pixelated] sm:size-48",
              mine.hp === 0 && "opacity-0 transition-opacity",
            )}
            animate={hit("ai") ? shake : undefined}
            transition={{ duration: 0.35, delay: 0.15 }}
          />
          <FighterBox fighter={mine} team={battle.player} label="You" />
        </div>

        <AnimatePresence>
          {battle.winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm"
            >
              <p className="kicker">Battle over</p>
              <h2 className="mt-2 text-4xl font-black">{battle.winner === "player" ? "You won!" : "You lost."}</h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                {battle.winner === "player"
                  ? "Good type matchups. You'd do fine in a code review."
                  : "The AI read the type chart better this time. Happens to the best."}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={start}
                  className="inline-flex items-center gap-2 rounded-md border-2 bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard-sm"
                >
                  <RotateCcw className="size-4" /> Rematch
                </button>
                <Link href="/battle" className="rounded-md border-2 bg-card px-4 py-2 font-bold shadow-hard-sm">
                  Change team
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* text box + moves, like the bottom half of the gameboy screen */}
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="panel min-h-32 p-4 font-mono text-sm" aria-live="polite">
          {battle.log.length === 0 ? (
            <p>
              The AI wants to battle! What will {titleCase(mine.name)} do?
              <span className="ml-1 animate-blink">▼</span>
            </p>
          ) : (
            <ul className="space-y-1">
              {lastTurn.map((e, i) => (
                <li key={i}>{describeEvent(e)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {mine.moves.map((m, i) => (
            <button
              key={m.name}
              onClick={() => attack(i)}
              disabled={locked || !!battle.winner || mine.hp === 0}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-left shadow-hard-sm transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60",
                typeColor(m.type),
              )}
            >
              <span className="block truncate font-bold">{titleCase(m.name)}</span>
              <span className="font-mono text-[11px] uppercase opacity-80">
                {m.type} · {m.power ?? "-"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {battle.log.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-sm text-muted-foreground">
            Full battle log ({battle.log.length})
          </summary>
          <ol className="panel mt-2 max-h-60 space-y-1 overflow-y-auto p-4 font-mono text-xs">
            {battle.log.map((e, i) => (
              <li key={i}>{describeEvent(e)}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-24 text-center">{children}</div>;
}
