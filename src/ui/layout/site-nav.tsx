"use client";

import { Github } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/cn";
import { Pokeball } from "@/ui/primitives/pokeball";

const LINKS = [
  { href: "/", label: "Hire me", short: "Hire" },
  { href: "/pokedex", label: "Pokédex", short: "Dex" },
  { href: "/battle", label: "Battle", short: "Battle" },
  { href: "/architecture", label: "How it's built", short: "Arch" },
];

export function SiteNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b-2 bg-primary text-primary-foreground">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <Link href="/" className="mr-auto flex items-center gap-2 font-bold tracking-tight">
          <Pokeball className="size-7 border-foreground" />
          <span className="hidden sm:inline">Younes Kad</span>
        </Link>

        <ul className="flex items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-2 py-1.5 font-medium sm:px-2.5 transition-colors hover:bg-black/15",
                  isActive(l.href) && "bg-card text-foreground shadow-hard-sm hover:bg-card",
                )}
              >
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <a
          href="https://github.com/TopGEpitech/Pokedex-Nextjs14"
          target="_blank"
          rel="noreferrer"
          className="ml-1 rounded-md p-1.5 hover:bg-black/15"
          aria-label="Source code on GitHub"
        >
          <Github className="size-5" />
        </a>
      </nav>
    </header>
  );
}
