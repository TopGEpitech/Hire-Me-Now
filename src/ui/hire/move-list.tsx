import type { ProfileMove } from "@/core/domain/profile/profile";
import { TypeBadge } from "@/ui/type-badge";

export function MoveList({ moves }: { moves: ProfileMove[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {moves.map((m) => (
        <li key={m.name} className="panel flex flex-col p-5 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <TypeBadge type={m.type} />
            <span className="font-mono text-xs text-muted-foreground">
              PWR {m.power} · PP {m.pp}/{m.pp}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-extrabold">{m.name}</h3>
          <p className="mt-1.5 text-muted-foreground">{m.text}</p>
        </li>
      ))}
    </ul>
  );
}
