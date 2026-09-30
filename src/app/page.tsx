import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { app } from "@/composition/server";
import { FinalChoice } from "@/ui/hire/final-choice";
import { MatchupPicker } from "@/ui/hire/matchup-picker";
import { MoveList } from "@/ui/hire/move-list";
import { Section } from "@/ui/hire/section";
import { StatBlock } from "@/ui/hire/stat-block";
import { Timeline } from "@/ui/hire/timeline";
import { TrainerCard } from "@/ui/hire/trainer-card";

const PROOF = [
  {
    href: "/pokedex",
    title: "Pokédex",
    text: "All 151 from gen 1. 1 request for the whole list, search by name or number, detail pages with stats + every evolution branch.",
  },
  {
    href: "/battle",
    title: "Battle vs AI",
    text: "Build a team of 6 and fight an AI that actually reads the type chart. Real stat formulas. Speed decides who swings first.",
  },
  {
    href: "/architecture",
    title: "How it's built",
    text: "Hexagonal core, ports + adapters, an API with RBAC. There's a playground where you can get a 403 on purpose. Go on.",
  },
  {
    href: "/architecture#ai",
    title: "AI coach + MCP",
    text: "Rates your team from real numbers, streams its answer, switches model if 1 fails. Graded by evals in CI. Also plugs into Claude or Cursor as an MCP server.",
  },
  {
    href: "/architecture#services",
    title: "Go + Python services",
    text: "A Go gateway that took 10 000 simulated devices without losing an event, + a Python detector that flags weird telemetry.",
  },
  {
    href: "https://github.com/TopGEpitech/Pokedex-Nextjs14",
    title: "Source + CI",
    text: "Every push: lint, types, 150+ tests, go + python tests, AI evals, docker, cypress + axe, k6. Red CI, no merge.",
  },
];

export default function HirePage() {
  // the page is a driving adapter like any other: it asks the core, as a visitor
  const profile = app.getProfile("visitor");

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="kicker">
            Pokédex entry No. 152 <span className="animate-blink">_</span>
          </p>
          <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            Why you should <span className="bg-accent px-2 [box-decoration-break:clone]">hire me.</span>
          </h1>
          <p className="mt-5 text-lg font-semibold">
            {profile.name}. {profile.headline}
          </p>

          <div className="mt-4 max-w-xl space-y-3 text-muted-foreground">
            {profile.pitch.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#choice"
              className="inline-flex items-center gap-2 rounded-lg border-2 bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard transition-transform hover:-translate-y-0.5"
            >
              I choose you!
            </a>
            <a
              href="#proof"
              className="inline-flex items-center gap-2 rounded-lg border-2 bg-card px-5 py-3 font-bold shadow-hard transition-transform hover:-translate-y-0.5"
            >
              Show me the proof <ArrowRight className="size-4" />
            </a>
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">{profile.location}</p>
        </div>

        <TrainerCard profile={profile} />
      </section>

      <Section
        id="stats"
        kicker="Base stats"
        title="Yes, I rated myself."
        intro="Everybody does. Mine come with receipts, so you can check every number instead of trusting it."
      >
        <StatBlock stats={profile.stats} />
      </Section>

      <Section
        id="moves"
        kicker="Moveset"
        title="4 moves I bring to a team"
        intro="Pokémon only lets you keep 4. Good rule for a CV too, it forces you to pick what matters."
      >
        <MoveList moves={profile.moves} />
      </Section>

      <Section
        id="matchups"
        kicker="Type matchups"
        title="Tell me what hurts."
        intro="Pick the problem your team has right now. I'll tell you what I'd throw at it."
      >
        <MatchupPicker name={profile.name} matchups={profile.matchups} />
      </Section>

      <Section
        id="proof"
        kicker="Proof, not promises"
        title="Don't trust me. Click stuff."
        intro="Everything here runs on this site. The Pokédex, the battle, the API. Break it if you can, I'd honestly like to know."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {PROOF.map((p) => {
            const external = p.href.startsWith("http");
            const body = (
              <>
                <span className="flex items-center justify-between text-xl font-extrabold">
                  {p.title}
                  {external ? (
                    <Github className="size-5" />
                  ) : (
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  )}
                </span>
                <span className="mt-2 block text-muted-foreground">{p.text}</span>
              </>
            );
            const cls = "panel group block h-full p-5 transition-transform hover:-translate-y-0.5";
            return (
              <li key={p.href}>
                {external ? (
                  <a href={p.href} target="_blank" rel="noreferrer" className={cls}>
                    {body}
                  </a>
                ) : (
                  <Link href={p.href} className={cls}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        id="history"
        kicker="Trainer history"
        title="Where I've been"
        intro="Newest first. The esport part is real, I promise it's relevant."
      >
        <Timeline entries={profile.timeline} />
      </Section>

      <Section id="bag" kicker="Bag" title="What's in my bag">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="panel p-5">
            <h3 className="font-mono text-sm font-bold uppercase">Tools</h3>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <li key={s} className="rounded-md border-2 bg-background px-2.5 py-1 text-sm font-medium">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="panel p-5">
              <h3 className="font-mono text-sm font-bold uppercase">Languages</h3>
              <ul className="mt-3 space-y-1.5">
                {profile.languages.map((l) => (
                  <li key={l.name} className="flex justify-between gap-4">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-muted-foreground">{l.level}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-5">
              <h3 className="font-mono text-sm font-bold uppercase">Off the keyboard</h3>
              <p className="mt-2 text-muted-foreground">
                {profile.hobbies.join(", ")}. BJJ teaches you to stay calm when stuff goes wrong. Chess too, just
                slower.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="choice" kicker="Final battle" title="So. What will you do?">
        <FinalChoice profile={profile} />
      </Section>
    </>
  );
}
