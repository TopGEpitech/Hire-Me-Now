"use client";

import { Dices, Loader2, Plus, Search, Swords, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { pickRival, recruit, teamStore } from "@/composition/browser";
import { MAX_TEAM_SIZE, matchesSearch, type PokemonSummary, type TeamMember } from "@/core/domain/pokemon/pokemon";
import { TeamRuleBroken, addToTeam, removeFromTeam } from "@/core/domain/pokemon/team";
import { cn } from "@/ui/cn";
import { CoachPanel } from "@/ui/coach/coach-panel";
import { dexNumber, titleCase } from "@/ui/format";
import { usePokedex } from "@/ui/pokedex/pokedex-browser";
import { Pokeball } from "@/ui/primitives/pokeball";
import { ScrollArea } from "@/ui/primitives/scroll-area";
import { TypeBadge } from "@/ui/type-badge";
import { typeColor } from "@/ui/type-colors";

export function TeamBuilder() {
  const { list, failed } = usePokedex();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState<number | "random" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // localStorage only exists in the browser, so read it after mount
  useEffect(() => setTeam(teamStore.load()), []);

  const update = (next: TeamMember[]) => {
    setTeam(next);
    teamStore.save(next);
  };

  const add = async (p: PokemonSummary) => {
    setNotice(null);
    setBusy(p.id);
    try {
      update(addToTeam(team, await recruit(String(p.id))));
    } catch (e) {
      setNotice(e instanceof TeamRuleBroken ? e.message : `Couldn't load ${p.name}, PokéAPI is being slow. Try again?`);
    } finally {
      setBusy(null);
    }
  };

  const randomTeam = async () => {
    setNotice(null);
    setBusy("random");
    try {
      update(await pickRival());
    } catch {
      setNotice("Random team failed to load. PokéAPI hiccup, try again.");
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => (list ?? []).filter((p) => matchesSearch(p, query)), [list, query]);
  const inTeam = new Set(team.map((m) => m.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Step 1 of 2</p>
          <h1 className="text-4xl font-black tracking-tight">Build your team</h1>
          <p className="mt-1 text-muted-foreground">
            Up to {MAX_TEAM_SIZE}. Each one gets 4 random moves, types + power come from PokéAPI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={randomTeam}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md border-2 bg-card px-3 py-2 text-sm font-bold shadow-hard-sm disabled:opacity-50"
          >
            {busy === "random" ? <Loader2 className="size-4 animate-spin" /> : <Dices className="size-4" />}
            Random team
          </button>
          <button
            onClick={() => {
              teamStore.clear();
              setTeam([]);
            }}
            disabled={!team.length}
            className="inline-flex items-center gap-2 rounded-md border-2 bg-card px-3 py-2 text-sm font-bold shadow-hard-sm disabled:opacity-50"
          >
            <Trash2 className="size-4" /> Clear
          </button>
          <Link
            href="/battle/arena"
            aria-disabled={!team.length}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border-2 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-hard",
              !team.length && "pointer-events-none opacity-50",
            )}
          >
            <Swords className="size-4" /> Fight!
          </Link>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-md border-2 bg-accent px-3 py-2 text-sm font-medium">
          {notice}
        </p>
      )}

      <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: MAX_TEAM_SIZE }, (_, slot) => {
          const m = team[slot];
          if (!m) {
            return (
              <li
                key={`empty-${slot}`}
                className="flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-foreground/30 text-muted-foreground"
              >
                <Pokeball className="size-8 opacity-30" />
              </li>
            );
          }
          return (
            <li key={m.id} className="panel relative overflow-hidden p-4">
              <div className={cn("absolute inset-x-0 top-0 h-1.5", typeColor(m.types[0]))} />
              <button
                onClick={() => update(removeFromTeam(team, m.id))}
                className="absolute right-2 top-3 rounded-md p-1 hover:bg-muted"
                aria-label={`Remove ${m.name}`}
              >
                <X className="size-4" />
              </button>
              <div className="flex items-center gap-3">
                <Image
                  src={m.sprite}
                  alt={m.name}
                  width={72}
                  height={72}
                  unoptimized
                  className="[image-rendering:pixelated]"
                />
                <div>
                  <p className="text-lg font-extrabold capitalize">{m.name}</p>
                  <div className="mt-1 flex gap-1">
                    {m.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-1.5">
                {m.moves.map((mv) => (
                  <li
                    key={mv.name}
                    className={cn("truncate rounded-md border px-2 py-1 text-xs font-semibold", typeColor(mv.type))}
                  >
                    {titleCase(mv.name)}
                    <span className="ml-1 opacity-75">{mv.power ?? "-"}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <CoachPanel team={team} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Pick from gen 1</h2>
        <label className="flex w-full max-w-xs items-center gap-2 rounded-lg border-2 bg-card px-3 shadow-hard-sm">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Filter"
            className="w-full bg-transparent py-2 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {failed && <p className="panel mt-4 p-4">Couldn&apos;t load the list. PokéAPI is having a moment.</p>}

      <ScrollArea className="mt-4 h-[28rem] rounded-xl border-2 bg-card p-3">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {shown.map((p) => {
            const taken = inTeam.has(p.id);
            return (
              <li key={p.id}>
                <button
                  onClick={() => add(p)}
                  disabled={taken || busy !== null || team.length >= MAX_TEAM_SIZE}
                  className="group relative flex w-full flex-col items-center rounded-lg border-2 border-transparent p-1.5 hover:border-foreground disabled:opacity-40 disabled:hover:border-transparent"
                  aria-label={`Add ${p.name}`}
                >
                  <span className="self-start font-mono text-[10px] text-muted-foreground">{dexNumber(p.id)}</span>
                  <Image
                    src={p.sprite}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="[image-rendering:pixelated]"
                  />
                  <span className="text-xs font-semibold capitalize">{p.name}</span>
                  <span className="absolute right-1 top-1 hidden rounded-full bg-primary p-0.5 text-primary-foreground group-enabled:group-hover:block">
                    {busy === p.id ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
