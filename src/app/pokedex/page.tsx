import type { Metadata } from "next";
import Image from "next/image";
import { PokedexBrowser } from "@/ui/pokedex/pokedex-browser";

export const metadata: Metadata = { title: "Pokédex" };

export default function PokedexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <Image src="/pokedex.png" alt="Pokédex" width={260} height={94} priority />
        <p className="mt-3 max-w-lg text-muted-foreground">
          The original project. All 151 from gen 1, loaded through my own API (which talks to PokéAPI), so the browser
          never hits PokéAPI directly.
        </p>
      </div>
      <PokedexBrowser />
    </div>
  );
}
