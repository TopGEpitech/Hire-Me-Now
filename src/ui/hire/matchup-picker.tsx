"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Matchup } from "@/core/domain/profile/profile";
import { cn } from "@/ui/cn";

export function MatchupPicker({ name, matchups }: { name: string; matchups: Matchup[] }) {
  const [picked, setPicked] = useState<Matchup | null>(null);
  const firstName = name.split(" ")[0].toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <ul className="flex flex-wrap content-start gap-2" aria-label="Pick a problem">
        {matchups.map((m) => (
          <li key={m.problem}>
            <button
              type="button"
              onClick={() => setPicked(m)}
              aria-pressed={picked?.problem === m.problem}
              className={cn(
                "rounded-full border-2 bg-card px-4 py-2 text-left text-sm font-semibold shadow-hard-sm transition-all hover:-translate-y-0.5",
                picked?.problem === m.problem && "bg-accent",
              )}
            >
              {m.problem}
            </button>
          </li>
        ))}
      </ul>

      {/* the classic white text box at the bottom of the screen */}
      <div className="panel min-h-48 p-5 font-mono" aria-live="polite">
        <AnimatePresence mode="wait">
          {picked ? (
            <motion.div
              key={picked.problem}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-lg font-bold">
                {firstName} used {picked.move.toUpperCase()}!
              </p>
              <p
                className={cn("mt-1 font-bold", picked.verdict === "super" ? "text-primary" : "text-muted-foreground")}
              >
                {picked.verdict === "super" ? "It's super effective!" : "It's effective. Not magic tho."}
              </p>
              <p className="mt-4 font-sans leading-relaxed">{picked.text}</p>
            </motion.div>
          ) : (
            <motion.p key="idle" className="text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              What&apos;s hurting your team right now? Pick 1 on the left.
              <span className="ml-1 animate-blink">▼</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
