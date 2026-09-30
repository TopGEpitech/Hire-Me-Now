"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FLAGS, FLAGS, type FlagName } from "@/core/domain/flags/flags";

type Flags = Record<FlagName, boolean>;

const defaults = Object.fromEntries(FLAGS.map((f) => [f, DEFAULT_FLAGS[f].enabled])) as Flags;

// server decides, browser just reads. if the call fails we keep the defaults, no drama
export function useFlags() {
  const [flags, setFlags] = useState<Flags>(defaults);

  useEffect(() => {
    let alive = true;
    fetch("/api/flags", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((f: Flags | null) => alive && f && setFlags(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return flags;
}
