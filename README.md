# Why you should hire me

![The hire me page](docs/screenshots/hire-me.png)

Hey. I'm **Younes Kad**, lead dev, full stack, TypeScript + JavaScript. Based in Lyon, looking for full remote.

This repo started as a small Pokédex I built for fun with Next.js 14. Then I had a thought. Why send 1 more PDF when I could send something you can actually click, break + read the code of? So I rebuilt it as my pitch. Same Pokémon. But now with the architecture, the tests and the security I'd bring to your team, bcs that's the stuff a CV can't really show.

## What's in here

| Route           | What it is                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| `/`             | The pitch. My CV as a Pokédex entry: base stats, moves, type matchups, history      |
| `/pokedex`      | The original project, cleaned up. 151 Pokémon, search, detail pages with evolutions |
| `/battle`       | Build a team of 6, then fight an AI that reads the type chart                       |
| `/architecture` | How it's built + a live API playground where you can get a 403 on purpose           |

## Run it

```bash
npm ci
cp .env.example .env.local   # then put a real AUTH_SECRET in there
npm run dev
```

Open http://localhost:3000. Go to `/architecture`, hit `/api/contact` + you get a 403. Log in with the recruiter code from your `.env.local`. Hit it again. 200.

That's RBAC in 10 seconds.

## Architecture: hexagonal

Short version: bcs frameworks change, business rules don't.

I've watched framework upgrades, gateway swaps + data migrations at work, and the code that hurt every time was the code where the rules were glued to the framework. So here the rules sit in the middle and don't know Next.js exists.

![Hexagon diagram](docs/screenshots/hexagon.png)

```
src/
├─ core/                    the hexagon. no next, no react, no fetch
│  ├─ domain/               pure rules: battle engine, rbac policy, team rules
│  └─ application/          ports.ts (what the core needs) + use cases
├─ adapters/
│  ├─ driving/http/         request -> use case, error -> status code
│  └─ driven/               pokeapi, api-client, security, storage, audit, contact, content
├─ composition/             the ONLY place that plugs adapters into ports
├─ app/                     next.js routes. pages + 1 line api routes
└─ ui/                      react components. no business rules in there
```

It's not just a folder convention. ESLint blocks any import of `next`, `react` or `@/adapters/*` from inside `src/core`, so if someone breaks the boundary, CI goes red. See [`.eslintrc.json`](.eslintrc.json).

My favorite detail: the `PokemonCatalog` port has 2 adapters. On the server it talks to PokéAPI. In the browser it talks to my own API. The use cases (like "recruit a Pokémon with 4 random moves") run on both sides + have no idea which one they got.

Longer reasoning in [docs/adr/0001-hexagonal-architecture.md](docs/adr/0001-hexagonal-architecture.md).

## API + RBAC

3 roles. 4 permissions. 1 policy file ([`src/core/domain/access/rbac.ts`](src/core/domain/access/rbac.ts)). Deny by default, no "admin skips the check" shortcut.

| Permission     | visitor | recruiter | admin |
| -------------- | :-----: | :-------: | :---: |
| `profile:read` |    ✓    |     ✓     |   ✓   |
| `pokedex:read` |    ✓    |     ✓     |   ✓   |
| `contact:read` |         |     ✓     |   ✓   |
| `audit:read`   |         |           |   ✓   |

| Method   | Path                 | Needs          |
| -------- | -------------------- | -------------- |
| `GET`    | `/api/me`            | nothing        |
| `POST`   | `/api/auth/session`  | an access code |
| `DELETE` | `/api/auth/session`  | nothing        |
| `GET`    | `/api/profile`       | `profile:read` |
| `GET`    | `/api/pokemon`       | `pokedex:read` |
| `GET`    | `/api/pokemon/:name` | `pokedex:read` |
| `GET`    | `/api/moves/:name`   | `pokedex:read` |
| `GET`    | `/api/contact`       | `contact:read` |
| `GET`    | `/api/admin/audit`   | `audit:read`   |

A few things I did on purpose:

- My phone number is **not** in this repo. It comes from env + only goes out to roles with `contact:read`.
- Sessions are HMAC signed, sent as an `HttpOnly`, `SameSite=Lax` cookie (+ `Secure` in prod). Kind of a JWT with no header, so no `alg: none` games.
- Access codes are compared in constant time. Login is rate limited to 5 tries a minute + only accepts JSON.
- Every denied call lands in an audit log. No IPs, just the role, the action + the result.

Why like this: [docs/adr/0002-rbac-and-sessions.md](docs/adr/0002-rbac-and-sessions.md).

## Tests + CI

```bash
npm test          # vitest, ~1s
npm run lint      # incl. the hexagon boundary rule
npm run typecheck # strict mode
npm run ci        # all of the above + a prod build
```

The tests go from the pure battle engine all the way to the http layer. The http tests build a real `Request`, send it through the same code the route files use + check status codes, cookies and headers. No server running, no Next.js mocking.

[GitHub Actions](.github/workflows/ci.yml) runs lint, typecheck, tests + build on every push and every PR.

## Env vars

| Name                    | What for                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `AUTH_SECRET`           | signs sessions. 32+ chars. `openssl rand -base64 48`        |
| `RECRUITER_ACCESS_CODE` | the code I send to recruiters. unset = nobody gets the role |
| `ADMIN_ACCESS_CODE`     | mine                                                        |
| `CONTACT_PHONE`         | shown to recruiter + admin only                             |
| `CONTACT_WHATSAPP`      | same                                                        |

Bad config crashes at boot with a clear message. Better than a weird 500 3 days later.

## What I'd change for a real prod

The audit log + rate limiter live in memory, so they reset on deploy and don't share between instances. Redis for the limiter + structured logs for the audit would fix it, and each one is just 1 new adapter. I'd also swap the access codes for a real identity provider behind the `TokenService` port. And there's no e2e yet. Playwright on the battle flow is next.

## Stack

Next.js 14 (app router), TypeScript strict, Tailwind + shadcn/ui, framer-motion, Zod, Vitest. Data from [PokéAPI](https://pokeapi.co).

## Contact

- younes.kadi@epitech.eu
- [youneskad.dev](https://www.youneskad.dev/)
- [LinkedIn](https://www.linkedin.com/in/younes-k-b2927b261/)

Pokémon is © Nintendo / Game Freak. Fan project, not affiliated.
