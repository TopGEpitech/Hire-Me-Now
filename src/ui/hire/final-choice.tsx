"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/core/domain/profile/profile";
import { cn } from "@/ui/cn";
import { Pokeball } from "@/ui/primitives/pokeball";

const RUN_LINES = [
  "Can't escape!",
  "No! There's no running from a trainer battle!",
  "Ok you really tried 3 times. Respect. Still can't escape tho.",
];

export function FinalChoice({ profile }: { profile: Profile }) {
  const [choice, setChoice] = useState<"idle" | "hire" | "run">("idle");
  const [runs, setRuns] = useState(0);
  const firstName = profile.name.split(" ")[0].toUpperCase();

  const message =
    choice === "hire"
      ? `Gotcha! ${firstName} was caught!`
      : choice === "run"
        ? RUN_LINES[Math.min(runs - 1, RUN_LINES.length - 1)]
        : `What will you do?`;

  return (
    <div className="panel overflow-hidden">
      <div className="bg-gradient-to-b from-sky-200 to-emerald-100 px-6 py-10 text-center">
        <p className="font-mono text-sm font-bold">Wild {firstName} appeared!</p>
        <Pokeball className={cn("mx-auto mt-4 size-16 border-[3px]", choice === "hire" && "animate-shake")} />
      </div>

      <div className="grid gap-0 border-t-2 sm:grid-cols-[1fr_auto]">
        <p className="p-5 font-mono text-lg font-bold" aria-live="polite">
          {message}
        </p>
        <div className="grid grid-cols-2 border-t-2 font-mono font-bold sm:border-l-2 sm:border-t-0">
          <button
            type="button"
            onClick={() => setChoice("hire")}
            className="border-r-2 px-8 py-5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            ▶ HIRE
          </button>
          <button
            type="button"
            onClick={() => {
              setChoice("run");
              setRuns((r) => r + 1);
            }}
            className="px-8 py-5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            RUN
          </button>
        </div>
      </div>

      {choice === "hire" && (
        <div className="border-t-2 bg-card p-5">
          <p className="text-muted-foreground">Nice pick. Here&apos;s how you reach me:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:${profile.email}?subject=${encodeURIComponent("I choose you!")}`}
              className="rounded-md border-2 bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-hard-sm hover:brightness-110"
            >
              {profile.email}
            </a>
            {profile.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border-2 bg-card px-4 py-2 font-semibold shadow-hard-sm hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Got a recruiter code from me? Unlock my phone + WhatsApp on the{" "}
            <Link href="/architecture#playground" className="font-medium text-foreground underline underline-offset-4">
              API playground
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
