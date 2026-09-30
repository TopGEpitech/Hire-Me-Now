import type { TimelineEntry } from "@/core/domain/profile/profile";

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l-2 border-dashed pl-6 sm:pl-8">
      {entries.map((e) => (
        <li key={`${e.org}-${e.from}`} className="relative">
          <span className="absolute -left-[33px] top-5 size-4 rounded-full border-2 bg-accent sm:-left-[41px]" />
          <div className="panel p-5">
            <p className="font-mono text-xs text-muted-foreground">
              {e.from} → {e.to} · {e.place}
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-snug">
              {e.role} <span className="text-primary">@ {e.org}</span>
            </h3>
            <p className="mt-2 text-muted-foreground">{e.text}</p>
            {e.tags && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {e.tags.map((t) => (
                  <li key={t} className="rounded border bg-muted px-2 py-0.5 font-mono text-[11px]">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
