import { ArrowLeft, Swords } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { app } from "@/composition/server";
import { NotFound } from "@/core/application/errors";
import type { BaseStats } from "@/core/domain/pokemon/pokemon";
import { dexNumber, titleCase } from "@/ui/format";
import { ScrollArea } from "@/ui/primitives/scroll-area";
import { TypeBadge } from "@/ui/type-badge";

type Props = { params: { name: string } };

const STAT_LABELS: Array<[keyof BaseStats, string]> = [
  ["hp", "HP"],
  ["attack", "Attack"],
  ["defense", "Defense"],
  ["specialAttack", "Sp. Atk"],
  ["specialDefense", "Sp. Def"],
  ["speed", "Speed"],
];

export function generateMetadata({ params }: Props): Metadata {
  return { title: titleCase(params.name) };
}

async function load(name: string) {
  if (!/^[a-z0-9-]{1,40}$/i.test(name)) notFound();
  try {
    return await app.pokemonDetails("visitor", name.toLowerCase());
  } catch (e) {
    if (e instanceof NotFound) notFound();
    throw e;
  }
}

// server component: no loading spinner, no useEffect, the core answers before the html ships
export default async function PokemonPage({ params }: Props) {
  const p = await load(params.name);
  const total = Object.values(p.stats).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/pokedex" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" /> Back to the Pokédex
      </Link>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <div className="panel flex flex-col items-center bg-primary p-4">
          <div className="screen flex w-full items-center justify-center bg-card p-4">
            <Image
              src={p.sprite}
              alt={p.name}
              width={240}
              height={240}
              unoptimized
              priority
              className="size-60 [image-rendering:pixelated]"
            />
          </div>
          <p className="screen mt-4 w-full p-3 text-sm leading-relaxed">{p.description}</p>
        </div>

        <div className="panel p-5 sm:p-6">
          <p className="font-mono text-sm text-muted-foreground">{dexNumber(p.id)}</p>
          <h1 className="text-4xl font-black capitalize tracking-tight">{p.name}</h1>
          <div className="mt-3 flex gap-2">
            {p.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border-2 p-3">
              <dt className="kicker">Height</dt>
              <dd className="text-lg font-bold">{p.heightM} m</dd>
            </div>
            <div className="rounded-lg border-2 p-3">
              <dt className="kicker">Weight</dt>
              <dd className="text-lg font-bold">{p.weightKg} kg</dd>
            </div>
          </dl>

          <h2 className="mt-6 font-mono text-sm font-bold uppercase">Abilities</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {p.abilities.map((a) => (
              <li key={a.name} className="rounded-md border-2 px-2.5 py-1 text-sm font-medium">
                {titleCase(a.name)}
                {a.hidden && <span className="ml-1.5 text-xs text-muted-foreground">(hidden)</span>}
              </li>
            ))}
          </ul>

          <h2 className="mt-6 font-mono text-sm font-bold uppercase">Base stats</h2>
          <ul className="mt-2 space-y-1.5">
            {STAT_LABELS.map(([key, label]) => (
              <li key={key} className="grid grid-cols-[4.5rem_2.5rem_1fr] items-center gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-mono font-bold tabular-nums">{p.stats[key]}</span>
                <span className="h-2.5 overflow-hidden rounded-full border bg-muted">
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${Math.min(100, (p.stats[key] / 180) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[4.5rem_2.5rem_1fr] gap-2 border-t pt-1.5 text-sm font-bold">
              <span>Total</span>
              <span className="text-right font-mono tabular-nums">{total}</span>
            </li>
          </ul>
        </div>
      </div>

      {p.evolutions.length > 1 && (
        <section className="panel mt-6 p-5">
          <h2 className="font-mono text-sm font-bold uppercase">Evolution line</h2>
          <ul className="mt-3 flex flex-wrap items-center gap-3">
            {p.evolutions.map((evo) => (
              <li key={evo.id}>
                <Link
                  href={`/pokedex/${evo.name}`}
                  aria-current={evo.id === p.id ? "page" : undefined}
                  className="flex flex-col items-center rounded-lg border-2 px-3 py-2 hover:bg-muted aria-[current=page]:bg-accent"
                >
                  <Image
                    src={evo.sprite}
                    alt={evo.name}
                    width={80}
                    height={80}
                    unoptimized
                    className="[image-rendering:pixelated]"
                  />
                  <span className="text-sm font-semibold capitalize">{evo.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-sm font-bold uppercase">Can learn {p.moveNames.length} moves</h2>
          <Link
            href="/battle"
            className="inline-flex items-center gap-2 rounded-md border-2 bg-accent px-3 py-1.5 text-sm font-bold shadow-hard-sm"
          >
            <Swords className="size-4" /> Put it in a team
          </Link>
        </div>
        <ScrollArea className="mt-3 h-48 rounded-md border-2 p-3">
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {p.moveNames.map((m) => (
              <li key={m}>{titleCase(m)}</li>
            ))}
          </ul>
        </ScrollArea>
      </section>
    </div>
  );
}
