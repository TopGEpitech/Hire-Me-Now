import type { Metadata } from "next";
import { PERMISSIONS, ROLES, can, type Permission } from "@/core/domain/access/rbac";
import { app } from "@/composition/server";
import { ApiPlayground } from "@/ui/architecture/api-playground";
import { GymTourMap } from "@/ui/architecture/gym-tour-map";
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
  { method: "GET", path: "/api/health", permission: null, note: "status, version, uptime. for load balancers" },
  { method: "GET", path: "/api/flags", permission: null, note: "feature flags for you (sticky canary bucket)" },
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
  { method: "POST", path: "/api/coach", permission: "coach:use", note: "AI coach, streams server-sent events" },
  { method: "GET", path: "/api/route", permission: null, note: "shortest gym tour, ?from=pallet" },
  { method: "POST", path: "/api/events/hire", permission: null, note: "the HIRE button -> slack + signed webhook" },
];

const PIPELINE = [
  { step: "npm ci", note: "lockfile or nothing" },
  { step: "lint", note: "incl. the rule that guards the hexagon" },
  { step: "typecheck", note: "strict mode on" },
  { step: "test", note: "vitest, domain to http" },
  { step: "build", note: "real next build" },
  { step: "sdk check", note: "generated SDK = spec, or red" },
  { step: "go + python", note: "go test -race, pytest" },
  { step: "ai eval", note: "coach graded on fixed cases" },
  { step: "docker", note: "build the image + curl /api/health" },
  { step: "e2e + a11y", note: "cypress + axe (WCAG AA)" },
  { step: "load", note: "k6, p95 under 500ms" },
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
        intro="3 roles, 5 permissions, 1 policy file. Every use case takes the caller's role first + checks it before doing anything. Not in the policy? Then no. There's no secret admin bypass."
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
            <p>
              <strong className="text-foreground">Keycloak:</strong> set <code className="font-mono">OIDC_ISSUER</code>{" "}
              + <code className="font-mono">OIDC_AUDIENCE</code> and bearer tokens from a Keycloak realm work next to my
              own sessions. Signature checked against the realm&apos;s JWKS, issuer, audience, expiry, RS256/ES256 only.
              Realm roles <code className="font-mono">hireme-recruiter</code> /{" "}
              <code className="font-mono">hireme-admin</code> map to my roles.
            </p>
            <p>
              <strong className="text-foreground">OWASP:</strong> the{" "}
              <a
                className="font-medium text-foreground underline underline-offset-4"
                href="https://github.com/TopGEpitech/Pokedex-Nextjs14/blob/main/docs/security/owasp-top-10.md"
              >
                top 10 grid
              </a>{" "}
              maps each risk to the file that handles it, + says honestly which ones don&apos;t apply.
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
        title="Every push, same checks"
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

      <Section
        id="ai"
        kicker="AI"
        title="An AI coach that doesn't make stuff up"
        intro="Open /battle, build a team, hit 'Rate my team'. Here's what happens behind that button."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">It reads numbers, not vibes</h3>
            <p>
              The core computes the team&apos;s telemetry first: which types hit 2+ of your pokemon super effectively,
              what your moves cover, who did the damage last battle. The model gets that + the type chart as its docs.
              It never has to guess a weakness.
            </p>
            <p>
              The answer comes back as structured output (verdict, threats, fixes, mvp), streamed token by token, then
              validated with Zod on my side. A threat type that doesn&apos;t exist? Rejected.
            </p>
          </div>
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">It doesn&apos;t go down with the API</h3>
            <p>
              Chain: Claude Opus 5.5 (with server side fallback if a safety filter declines) → Claude Sonnet 5.5 if that
              fails (timeout, 5xx, bad json) → a plain rule engine if everything is down. The UI shows each switch. You
              always get an answer, + it&apos;s never a fake one.
            </p>
            <p>No API key on this deploy = the rule engine answers + says so. Rate limited, 5 questions a minute.</p>
          </div>
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Evals in CI</h3>
            <p>
              Fixed teams, checks graded by code (not by another LLM): right verdict, a real threat found, no fake
              threat, an mvp that&apos;s actually on the team. The rule baseline runs every time. With an API key in CI,
              Claude runs too + has to beat 85%.
            </p>
          </div>
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">MCP server</h3>
            <p>
              <code className="font-mono">npm run mcp</code> + add it to Claude Desktop, Claude Code or Cursor. 5 tools:
              search, pokedex entry, gym tour, a seeded battle simulator (same seed = same fight) and the coach. Same
              use cases as the site, just another driving adapter. MCP callers get visitor rights, nothing more.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="algo"
        kicker="Algorithms"
        title="Planning a round, the technician way"
        intro="Visiting every gym once + coming home is the same problem as planning a field technician's day. It's a TSP, too slow to solve exactly past ~12 stops."
      >
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3 text-muted-foreground">
            <p>
              Step 1, nearest neighbour: always go to the closest place you haven&apos;t been. Fast, usually ~25% off.
            </p>
            <p>
              Step 2, 2-opt: if 2 legs of the trip cross, reverse the bit in between. Repeat until nothing gets shorter.
              On Kanto it lands within 5% of the real optimum (a test brute forces the optimum to check), + 200 stops
              still plan in well under a second.
            </p>
            <p>
              Available at <code className="font-mono">/api/route?from=pallet</code> + as an MCP tool.
            </p>
          </div>
          <GymTourMap tour={app.planGymTour("pallet")} />
        </div>
      </Section>

      <Section
        id="services"
        kicker="Beyond Next.js"
        title="A Go gateway + a Python detector"
        intro="Not everything belongs in the web app. 2 small services in services/, each with its own tests in CI."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Telemetry gateway (Go)</h3>
            <p>
              Takes battle events as NDJSON, validates them, rate limits each device (token bucket), batches them +
              hands batches to a <code className="font-mono">Sink</code> interface. In prod that&apos;s a Kafka
              producer. Here it writes NDJSON, bcs there&apos;s no broker on this deploy.
            </p>
            <p>
              Prometheus metrics on /metrics for Grafana, + 4x hits pushed to browsers over server-sent events. A test
              fires 10 000 simulated devices at it: 100k events, 0 lost, race detector clean.
            </p>
          </div>
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Anomaly detection (Python)</h3>
            <p>
              Reads the gateway output from a pipe. Flags damage outliers per device with a robust z-score (median +
              MAD, so 1 huge value can&apos;t hide itself by dragging the average) + devices bursting way above the
              fleet.
            </p>
            <p>
              <code className="font-mono">go run ./cmd/gateway | python -m anomaly.detect</code>
            </p>
          </div>
        </div>
      </Section>

      <Section id="integrations" kicker="Integrations" title="Webhooks, Slack + an API that's written first">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Signed webhooks + Slack</h3>
            <p>
              Someone clicks HIRE or a recruiter logs in → an event goes out to Slack + to a webhook signed like Stripe
              does it: <code className="font-mono">t=timestamp,v1=hmac</code>. The timestamp is inside the signature, so
              a captured request can&apos;t be replayed 10 minutes later. 1 target down never blocks the others.
            </p>
          </div>
          <div className="panel space-y-2 p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">OpenAPI first</h3>
            <p>
              <code className="font-mono">openapi/openapi.yaml</code> is the contract. The TypeScript SDK is generated
              from it, + the browser uses that SDK. A test fails if a route + the spec drift apart, + CI fails if
              someone edits the spec without regenerating.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="ops"
        kicker="Ops"
        title="Flags, logs + a container"
        intro="My CV says feature flags, canary releases, structured logs + Docker. So here they are, running on this site."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Feature flags with a real canary</h3>
            <p className="mt-2">
              2 flags: <code className="font-mono">smart-ai</code> + <code className="font-mono">shiny-sprites</code>.
              On/off, per role, or a % rollout. You get an anonymous bucket cookie, a hash puts you in 0..99, so the
              same visitor always gets the same answer. No flicker.
            </p>
            <p className="mt-2">
              Rolling out the smart AI to 20% of people is 1 env var + a redeploy. Broken json in that var? Defaults + a
              warning in the logs. A typo in a flag should never take the site down.
            </p>
          </div>
          <div className="panel p-5 text-muted-foreground">
            <h3 className="text-lg font-extrabold text-foreground">Logs you can actually search</h3>
            <p className="mt-2">
              Every API call gets a request id, an <code className="font-mono">x-request-id</code> +{" "}
              <code className="font-mono">server-timing</code> header, and 1 JSON line: method, path, status, time,
              role. A crash sends the request id back, so a bug report points at the exact line.
            </p>
            <p className="mt-2">
              The logger is a port. Today it writes JSON to stdout. Tomorrow Datadog? New adapter, core unchanged.
            </p>
          </div>
          <div className="panel p-5 text-muted-foreground md:col-span-2">
            <h3 className="text-lg font-extrabold text-foreground">Docker</h3>
            <p className="mt-2">
              Multi stage build, Next standalone output, runs as a non root user, has a healthcheck. CI builds it on
              every push, starts it + curls <code className="font-mono">/api/health</code>. Same image goes to Cloud Run
              or anywhere that runs a container.
            </p>
          </div>
        </div>
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
