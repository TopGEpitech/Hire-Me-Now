"use client";

import { Bot, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { TeamMember } from "@/core/domain/pokemon/pokemon";
import { cn } from "@/ui/cn";
import { TypeBadge } from "@/ui/type-badge";

type Diagnosis = {
  model: string;
  verdict: "ready" | "risky" | "weak";
  summary: string;
  threats: Array<{ type: string; why: string }>;
  fixes: string[];
  mvp: string | null;
};

const VERDICT_STYLE = { ready: "bg-emerald-500 text-white", risky: "bg-accent", weak: "bg-destructive text-white" };

// reads server-sent events from a POST (EventSource only does GET, so it's done by hand)
async function* readSse(res: Response) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let cut;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const event = /^event: (.+)$/m.exec(raw)?.[1];
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (event && data) yield { event, data: JSON.parse(data) };
    }
  }
}

export function CoachPanel({ team }: { team: TeamMember[] }) {
  const [status, setStatus] = useState<"idle" | "thinking" | "done" | "error">("idle");
  const [stream, setStream] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const box = useRef<HTMLPreElement>(null);

  const ask = async () => {
    setStatus("thinking");
    setStream("");
    setNotes([]);
    setResult(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ team }),
      });
      if (res.status === 429) throw new Error("slow down, 5 questions a minute max");
      if (!res.ok || !res.body) throw new Error(`coach said ${res.status}`);

      for await (const { event, data } of readSse(res)) {
        if (event === "delta") {
          setStream((s) => s + data.text);
          box.current?.scrollTo({ top: box.current.scrollHeight });
        }
        if (event === "fallback") setNotes((n) => [...n, `${data.from} failed, switching to ${data.to}`]);
        if (event === "diagnosis") setResult(data);
        if (event === "error") throw new Error(data.error);
      }
      setStatus("done");
    } catch (e) {
      setNotes((n) => [...n, (e as Error).message]);
      setStatus("error");
    }
  };

  return (
    <section className="panel mt-6 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Bot className="size-5" /> AI coach
          </h2>
          <p className="text-sm text-muted-foreground">
            Reads your team&apos;s numbers + the type chart, streams its answer, falls back to another model if 1 fails.
          </p>
        </div>
        <button
          onClick={ask}
          disabled={!team.length || status === "thinking"}
          className="inline-flex items-center gap-2 rounded-md border-2 bg-accent px-4 py-2 text-sm font-bold shadow-hard-sm disabled:opacity-50"
        >
          {status === "thinking" && <Loader2 className="size-4 animate-spin" />}
          Rate my team
        </button>
      </div>

      {stream && !result && (
        <pre ref={box} className="screen mt-4 max-h-32 overflow-auto whitespace-pre-wrap break-all p-3 text-xs">
          {stream}
        </pre>
      )}

      {notes.map((n) => (
        <p key={n} className="mt-2 font-mono text-xs text-muted-foreground">
          ↳ {n}
        </p>
      ))}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border-2 px-3 py-0.5 font-mono text-sm font-bold uppercase",
                VERDICT_STYLE[result.verdict],
              )}
            >
              {result.verdict}
            </span>
            <span className="font-semibold">{result.summary}</span>
          </div>
          {result.threats.length > 0 && (
            <ul className="space-y-1">
              {result.threats.map((t) => (
                <li key={t.type} className="flex flex-wrap items-center gap-2 text-sm">
                  <TypeBadge type={t.type} /> {t.why}
                </li>
              ))}
            </ul>
          )}
          <ul className="list-inside list-disc text-sm">
            {result.fixes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="font-mono text-xs text-muted-foreground">
            {result.mvp && <>mvp: {result.mvp} · </>}answered by {result.model}
          </p>
        </div>
      )}
    </section>
  );
}
