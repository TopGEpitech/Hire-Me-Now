import type { ProfileStat } from "@/core/domain/profile/profile";

// pokemon stat bars go green / yellow / red depending on how high they are
const barColor = (v: number) =>
  v >= 110 ? "bg-emerald-500" : v >= 90 ? "bg-lime-400" : v >= 60 ? "bg-yellow-400" : "bg-orange-500";

export function StatBlock({ stats }: { stats: ProfileStat[] }) {
  const total = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="panel p-4 sm:p-6">
      <ul className="divide-y-2 divide-dashed divide-muted">
        {stats.map((s) => (
          <li key={s.key} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[10rem_3rem_1fr] sm:items-center sm:gap-4">
            <span className="font-mono text-sm font-bold uppercase">{s.label}</span>
            <span className="hidden font-mono text-lg font-bold tabular-nums sm:block">{s.value}</span>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold tabular-nums sm:hidden">{s.value}</span>
                <div
                  className="h-3 flex-1 overflow-hidden rounded-full border-2 bg-muted"
                  role="meter"
                  aria-label={s.label}
                  aria-valuenow={s.value}
                  aria-valuemin={0}
                  aria-valuemax={150}
                >
                  <div
                    className={`h-full ${barColor(s.value)}`}
                    style={{ width: `${Math.min(100, (s.value / 150) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.receipt}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t-2 pt-3 font-mono text-sm font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">{total}</span>
      </p>
    </div>
  );
}
