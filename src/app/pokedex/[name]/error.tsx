"use client";

import Link from "next/link";

export default function PokemonError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="kicker">Error</p>
      <h1 className="mt-2 text-3xl font-black">PokéAPI didn&apos;t answer.</h1>
      <p className="mt-3 text-muted-foreground">Not my server this time, promise. Give it a sec + retry.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-md border-2 bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard-sm"
        >
          Retry
        </button>
        <Link href="/pokedex" className="rounded-md border-2 bg-card px-4 py-2 font-bold shadow-hard-sm">
          Back
        </Link>
      </div>
    </div>
  );
}
