import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Next.js 14, TypeScript, a hexagonal core + way too many Pokémon puns.{" "}
          <Link href="/architecture" className="font-medium text-foreground underline underline-offset-4">
            See how it&apos;s built
          </Link>
          .
        </p>
        <p className="text-xs">
          Pokémon data from PokéAPI. Pokémon is © Nintendo / Game Freak. Fan project, not affiliated.
        </p>
      </div>
    </footer>
  );
}
