"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalog } from "@/composition/browser";
import { GEN_ONE_COUNT, matchesSearch, type PokemonSummary } from "@/core/domain/pokemon/pokemon";
import { dexNumber } from "@/ui/format";
import { Skeleton } from "@/ui/primitives/skeleton";

export function usePokedex() {
  const [list, setList] = useState<PokemonSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    catalog
      .list(GEN_ONE_COUNT)
      .then((l) => alive && setList(l))
      .catch(() => alive && setFailed(true));
    // don't set state on a page the user already left
    return () => {
      alive = false;
    };
  }, []);

  return { list, failed };
}

export function PokedexBrowser() {
  const { list, failed } = usePokedex();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => (list ?? []).filter((p) => matchesSearch(p, query)), [list, query]);

  return (
    <>
      <label className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-lg border-2 bg-card px-3 shadow-hard-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name or number (pika, 25, #025)"
          className="w-full bg-transparent py-2.5 outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {failed && (
        <p className="panel mx-auto mt-8 max-w-md p-4 text-center">PokéAPI is taking a nap. Try again in a minute.</p>
      )}

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {!list && !failed
          ? Array.from({ length: 18 }, (_, i) => (
              <li key={i} className="panel p-3">
                <Skeleton className="mx-auto size-24 rounded-full" />
                <Skeleton className="mx-auto mt-3 h-4 w-20" />
              </li>
            ))
          : shown.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pokedex/${p.name}`}
                  className="panel group flex flex-col items-center p-3 transition-transform hover:-translate-y-1"
                >
                  <span className="self-start font-mono text-xs text-muted-foreground">{dexNumber(p.id)}</span>
                  <Image
                    src={p.sprite}
                    alt={p.name}
                    width={96}
                    height={96}
                    unoptimized
                    className="size-24 [image-rendering:pixelated] group-hover:scale-110"
                  />
                  <span className="font-semibold capitalize">{p.name}</span>
                </Link>
              </li>
            ))}
      </ul>

      {list && shown.length === 0 && (
        <p className="mt-8 text-center font-mono text-muted-foreground">
          No &quot;{query}&quot; in gen 1. Wild MISSINGNO appeared?
        </p>
      )}
    </>
  );
}
