import type { Metadata } from "next";
import { PERMISSIONS, ROLES, can, type Permission } from "@/core/domain/access/rbac";
import { ApiPlayground } from "@/ui/architecture/api-playground";
import { HexagonDiagram } from "@/ui/architecture/hexagon-diagram";
import { Section } from "@/ui/hire/section";

export const metadata: Metadata = {
  title: "How it's built",
  description: "Hexagonal architecture, an API with RBAC, tests + CI. The boring parts that make the fun parts safe.",
};

const FOLDERS = `src/
├─ core/                    the hexagon. no next, no react, no fetch
│  ├─ domain/               pure rules, 0 dependencies
│  │  ├─ battle/            type chart, damage formula, turn engine
│  │  ├─ access/rbac.ts     roles -> permissions. 1 file, deny by default
│  │  ├─ pokemon/           pokemon + team rules
│  │  └─ profile/           shape of my trainer card
│  └─ application/
│     ├─ ports.ts           what the core needs from outside
│     ├─ app.ts             every use case takes the caller's role first
│     └─ use-cases/         sessions, authorize, recruit pokemon
├─ adapters/
│  ├─ driving/http/         request -> use case, error -> status code
│  └─ driven/               pokeapi, api-client, security, storage,
│                           audit, contact, content (my CV lives here)
├─ composition/             the ONLY place that plugs adapters into ports
├─ app/                     next.js routes. pages + 1 line api routes
└─ ui/                      react components. zero business rules`;

type Endpoint = { method: string; path: string; permission: Permission | null; note: string };

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/me", permission: null, note: "your role + what it can do" },
  {
    method: "POST",
    path: "/api/auth/session",
    permission: null,
    note: "access code -> signed HttpOnly cookie. 5 tries/min",
  },
  { method: "DELETE", path: "/api/auth/session", permission: null, note: "log out" },
  { method: "GET", path: "/api/profile", permission: "profile:read", note: "my CV as json" },
  { method: "GET", path: "/api/pokemon", permission: "pokedex:read", note: "gen 1 list, ?limit=1..151" },
  { method: "GET", path: "/api/pokemon/:name", permission: "pokedex:read", note: "stats, flavor text, evolutions" },
  { method: "GET", path: "/api/moves/:name", permission: "pokedex:read", note: "type + power" },
  { method: "GET", path: "/api/contact", permission: "contact:read", note: "phone + whatsapp, from env" },
  { method: "GET", path: "/api/admin/audit", permission: "audit:read", note: "who tried what, denied or not" },
];

const PIPELINE = [
  { step: "npm ci", note: "lockfile or nothing" },
  { step: "lint", note: "incl. the rule that guards the hexagon" },
  { step: "typecheck", note: "strict mode on" },
  { step: "test", note: "vitest, domain to http" },
  { step: "build", note: "real next build" },
];

const rolesFor = (p: Permission | null) => (p ? ROLES.filter((r) => can(r, p)).join(", ") : "everyone");

export default function ArchitecturePage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:pt-16">
        <p className="kicker">How it&apos;s built</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          A Pokédex with the architecture of a real product.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Overkill for Pokémon? Yeah, kinda. But you&apos;re not hiring me to build a Pokédex. You&apos;re hiring me to
          build your thing, so this page shows how I&apos;d do that.
        </p>
      </div>

      <Section id="hexagonal" kicker="Architecture" title="Why hexagonal (ports + adapters)">
        <div className="grid gap-8">
          <div className="max-w-3xl space-y-4 text-muted-foreground">
            <p className="text-lg font-semibold text-foreground">
              Short answer: bcs frameworks change. Business rules don&apos;t.
            </p>
            <p>
              At work I&apos;ve seen Angular versions come + go, a gateway get swapped, data move from 1 place to
              another, and every single time the code that hurt the most was the code where the rules were glued to the
              framework.
            </p>
            <p>
              So the rules live in the middle. The battle engine, the RBAC policy, the team rules. None of it imports
              Next, React or fetch. When the core needs something from outside, it asks through a port. Adapters plug
              into those ports.
            </p>
            <p>New DB? New adapter. The core doesn&apos;t even notice.</p>
            <p>
              The best part is the tests tho. Pure functions + fake adapters means the whole suite runs in about a
              second, with 0 mocking of Next.js.
            </p>
            <p className="rounded-lg border-2 bg-accent/40 p-3 text-sm text-foreground">
              Fun one: the Pokédex uses the same <code className="font-mono">PokemonCatalog</code> port twice. On the
              server it&apos;s plugged into PokéAPI. In the browser it&apos;s plugged into my own API. The use cases
              can&apos;t tell which is which, + that&apos;s the point.
            </p>
          </div>
          <HexagonDiagram />
        </div>

        <pre className="panel mt-8 overflow-x-auto p-5 font-mono text-xs leading-relaxed sm:text-sm">{FOLDERS}</pre>
      </Section>

      <Section
        id="rbac"
        kicker="Access control"
        title="RBAC, deny by default"
        intro="3 roles, 4 permissions, 1 policy file. Every use case takes the caller's role first + checks it before doing anything. Not in the policy? Then no. There's no secret admin bypass."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 bg-muted/60 text-left">
                  <th className="p-3 font-mono text-xs uppercase">permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="p-3 text-center font-mono text-xs uppercase">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p} className="border-b last:border-0">
                    <td className="p-3 font-mono">{p}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="p-3 text-center text-lg" aria-label={can(r, p) ? "allowed" : "denied"}>
                        {can(r, p) ? "✓" : <span className="text-muted-foreground/60">✗</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">How you get a role:</strong> send an access code, get back a signed
              session in an HttpOnly cookie. It&apos;s basically a JWT with HS256 minus the header, so there&apos;s no{" "}
              <code className="font-mono">alg: none</code> trick to play. Signature checks are constant time.
            </p>
            <p>
              <strong className="text-foreground">Where the codes are:</strong> env vars. Not in git. Same for my phone
              number, which is why a visitor gets a 403 on <code className="font-mono">/api/contact</code> + a recruiter
              gets the real thing.
            </p>
            <p>
              <strong className="text-foreground">Hardening:</strong> login is rate limited (5/min per client) + only
              accepts JSON, so a random html form can&apos;t post to it. Cookies are SameSite=Lax + Secure in prod. Bad
              or expired cookie? You&apos;re a visitor again + the cookie gets dropped. Security headers are set in{" "}
              <code className="font-mono">next.config.mjs</code>.
            </p>
            <p>
              <strong className="text-foreground">Audit:</strong> every denied call + every read of private data lands
              in an audit log. No IPs stored, just role, action, allowed or not.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="api"
        kicker="The API"
        title="Endpoints"
        intro="Route files are 1 line each. The logic sits in the http adapter so it's tested with a plain Request object, no server running."
      >
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b-2 bg-muted/60 text-left font-mono text-xs uppercase">
                <th className="p-3">method</th>
                <th className="p-3">path</th>
                <th className="p-3">needs</th>
                <th className="p-3">who</th>
                <th className="p-3">what</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={`${e.method} ${e.path}`} className="border-b last:border-0">
                  <td className="p-3 font-mono font-bold">{e.method}</td>
                  <td className="p-3 font-mono">{e.path}</td>
                  <td className="p-3 font-mono text-xs">{e.permission ?? "-"}</td>
                  <td className="p-3">{rolesFor(e.permission)}</td>
                  <td className="p-3 text-muted-foreground">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="playground"
        kicker="Try it"
        title="API playground"
        intro="These are real calls to this site's API. If I sent you a recruiter code, log in + my phone number shows up."
      >
        <ApiPlayground />
        <pre className="panel mt-4 overflow-x-auto p-4 font-mono text-xs leading-relaxed">{`# prefer a terminal? same thing with curl
curl -i $HOST/api/contact                                   # 403, you're a visitor
curl -i -c jar -X POST $HOST/api/auth/session \\
     -H 'content-type: application/json' -d '{"accessCode":"<your code>"}'
curl -i -b jar $HOST/api/contact                            # 200`}</pre>
      </Section>

      <Section
        id="ci"
        kicker="CI"
        title="Every push, same 5 steps"
        intro="GitHub Actions on every push + every PR. If 1 step is red, it doesn't merge. Simple rule, saves a lot of Fridays."
      >
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="panel flex flex-1 flex-col p-4">
              <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="mt-1 font-mono text-lg font-bold">{p.step}</span>
              <span className="mt-1 text-sm text-muted-foreground">{p.note}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="next" kicker="Honest part" title="What I'd change for a real prod">
        <div className="panel space-y-3 p-5 text-muted-foreground">
          <p>
            The audit log + the rate limiter live in memory. They reset on deploy and don&apos;t share state between
            instances. For real traffic: Redis for the limiter, structured logs shipped somewhere for the audit.
            That&apos;s 1 new adapter each, the core stays the same.
          </p>
          <p>
            Access codes are fine for a portfolio. For a product I&apos;d put a real identity provider (Auth0 or
            similar) behind the <code className="font-mono">TokenService</code> port.
          </p>
          <p>No e2e tests yet. Playwright on the battle flow is next on the list.</p>
        </div>
      </Section>
    </>
  );
}
