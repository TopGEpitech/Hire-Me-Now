import Image from "next/image";
import type { Profile } from "@/core/domain/profile/profile";
import { TypeBadge } from "@/ui/type-badge";

export function TrainerCard({ profile }: { profile: Profile }) {
  const rows = [
    ["Species", "Lead Dev Pokémon"],
    ["Region", "Lyon, FR (remote pls)"],
    ["Lived in", "4 countries"],
    ["Speaks", profile.languages.map((l) => l.name.slice(0, 2).toUpperCase()).join(" / ")],
  ];

  return (
    <div className="panel relative overflow-hidden bg-primary p-3 text-primary-foreground sm:p-4">
      {/* the 3 little lights on top of a real pokedex */}
      <div className="mb-3 flex items-center gap-2">
        <span className="size-7 rounded-full border-2 border-foreground bg-sky-400 shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.25)]" />
        <span className="size-3 rounded-full border-2 border-foreground bg-red-400" />
        <span className="size-3 rounded-full border-2 border-foreground bg-yellow-300" />
        <span className="size-3 rounded-full border-2 border-foreground bg-green-400" />
        <span className="ml-auto font-mono text-xs font-bold">No. 152</span>
      </div>

      <div className="rounded-lg border-2 bg-card p-3 text-card-foreground">
        <div className="flex items-start gap-4">
          <div className="screen shrink-0 p-1.5">
            <Image
              src={profile.photo}
              alt={profile.name}
              width={112}
              height={119}
              priority
              className="rounded-md [image-rendering:auto]"
            />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">Trainer</p>
            <h2 className="text-xl font-extrabold uppercase leading-tight tracking-tight sm:text-2xl">
              {profile.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <TypeBadge type="typescript" />
              <TypeBadge type="full stack" />
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-xs uppercase leading-6 text-muted-foreground">{k}</dt>
              <dd className="font-medium leading-6">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="screen mt-3 p-3 text-sm leading-relaxed">
        Often seen near a CI pipeline. When a build turns red, it stays up late until it&apos;s green again
        <span aria-hidden className="ml-0.5 animate-blink">
          ▌
        </span>
      </p>
    </div>
  );
}
