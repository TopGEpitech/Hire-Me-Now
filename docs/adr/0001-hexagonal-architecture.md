# ADR 0001: hexagonal architecture

**Status:** accepted

## Context

The first version of this app was classic Next.js. Components fetched PokéAPI with axios inside `useEffect`, the battle rules lived in a page component, + state updates ran inside `setTimeout` callbacks with stale values. It mostly worked. It also had a type error that broke `next build`, and none of it could be tested without rendering React.

I wanted to turn it into something that shows how I build real products. So the question was simple: where do the rules live?

## Decision

Ports + adapters.

- `src/core/domain` holds pure rules. The battle engine, the RBAC policy, the team rules. No imports from outside the core, ever.
- `src/core/application` holds the use cases + the ports (interfaces) they need: `PokemonCatalog`, `TeamStore`, `TokenService`, `AuditLog`...
- `src/adapters` implements those ports. PokéAPI over http, my own API from the browser, localStorage, HMAC tokens, env secrets.
- `src/composition` is the only place that picks which adapter goes into which port.
- Next.js pages + API routes are just driving adapters. They call use cases, that's it.

ESLint enforces the direction with `no-restricted-imports` on `src/core/**`. A PR that imports `next` or an adapter into the core fails CI.

## Why

Frameworks move. Next.js alone changed its data fetching model twice in a few years. The rules of a Pokémon battle (or of a CRM) don't care about that. Keeping them separate means a framework upgrade touches the edges, not the middle.

The other reason is tests. The battle engine is a pure function: `playTurn(battle, moveIndex, random)`. Pass a fixed `random` and you get the same result every time. The whole suite runs in about 1 second with 0 mocking of Next.js.

## What it costs

More files + more indirection than a small app needs. For a 3 page site that's honestly overkill. I accept it here bcs the point of this repo is to show the pattern on something small enough to read in 10 minutes.

On a real project I'd still start with this shape, but I wouldn't create a port until there's a real reason to swap or fake something.
