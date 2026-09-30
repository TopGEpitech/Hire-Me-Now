# ADR 0002: RBAC + sessions

**Status:** accepted

## Context

I wanted recruiters to get my phone number, but not every bot that crawls GitHub. That's a real access control problem, just a small one. Good excuse to show how I handle RBAC at work, at a size you can read in 1 sitting.

## Decision

**Roles + permissions in 1 file.** `src/core/domain/access/rbac.ts` maps `visitor`, `recruiter`, `admin` to permissions like `contact:read`. If a permission isn't listed for a role, the answer is no. Admin has no magic bypass, it just has every permission listed. Adding a permission means adding it to the policy, + a test checks that no permission ends up unused.

**Every use case takes the role first.** `app.revealContact(role)`, `app.readAudit(role)`... The check happens in the application layer, not in the route. So a new entry point (a page, a CLI, a cron) can't forget it.

**Sessions.** An access code (from env) becomes a signed session: `base64url(payload).base64url(hmac)`. It's close to a JWT with HS256, minus the header. With only 1 algorithm there's nothing to negotiate, so there's no `alg: none` style attack. Verification uses `crypto.subtle.verify`, which is constant time. The token goes in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` in prod. Bearer headers work too for API clients.

**Hardening.** Login is rate limited per client (5/min) + only accepts `application/json`, so a plain html form on another site can't post to it. Codes are compared with `timingSafeEqual` on sha256 digests. A tampered or expired cookie makes you a visitor again + the response drops the cookie. Security headers are set for every route in `next.config.mjs`.

**Secrets.** Access codes + my phone number only exist in env. Env is parsed with Zod at boot, so a bad value crashes early with a clear message. A role with no code configured can't be reached at all. Fail closed.

**Audit.** Denied calls + reads of private data (`contact:read`, `audit:read`) go to an audit log. It stores the role, the action, the result + a timestamp. No IP, no user agent, bcs I don't need them for this.

## Trade-offs

The rate limiter + audit log are in memory. Fine for 1 instance, wrong for many. Both sit behind ports, so moving them to Redis / a log pipeline is 1 adapter each.

Access codes are good enough for a portfolio. A real product would use a proper identity provider (Auth0, Cognito, Keycloak...) behind the same `TokenService` port, + roles would come from the IdP claims instead of from a code.
