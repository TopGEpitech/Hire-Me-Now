import { z } from "zod";
import type { App } from "@/core/application/app";
import type { Clock, Logger } from "@/core/application/ports";
import { AccessDenied, InvalidAccessCode, NotFound, TooManyAttempts, UpstreamError } from "@/core/application/errors";
import { SESSION_TTL_MS, type Viewer } from "@/core/application/use-cases/sessions";
import { permissionsOf } from "@/core/domain/access/rbac";
import { GEN_ONE_COUNT } from "@/core/domain/pokemon/pokemon";

// Driving adapter: turns http into use case calls + use case errors into status codes.
// the next.js route files are 1 liners that point here, so all of this is testable with a plain Request

export const SESSION_COOKIE = "hm_session";
// anonymous + random, only used to keep you in the same feature flag bucket
export const BUCKET_COOKIE = "hm_bucket";
const REQUEST_ID = /^[a-zA-Z0-9-]{8,64}$/;

const SessionBody = z.object({ accessCode: z.string().trim().min(1).max(128) });
const Slug = z.string().regex(/^[a-z0-9-]{1,40}$/i);

// pokemon data is the same for every role that can read it, so the browser can keep it a bit
const BROWSER_CACHE = { "cache-control": "private, max-age=3600" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

function readCookie(req: Request, cookieName: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === cookieName) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return readCookie(req, SESSION_COOKIE);
}

// only used as a rate limit key, never stored
const clientKey = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

function fail(error: unknown, log: Logger, requestId: string): Response {
  if (error instanceof AccessDenied) {
    return json({ error: "forbidden", need: error.permission, youAre: error.role }, 403);
  }
  if (error instanceof InvalidAccessCode) return json({ error: "invalid_code" }, 401);
  if (error instanceof TooManyAttempts) {
    return json({ error: "too_many_attempts" }, 429, {
      "retry-after": String(Math.ceil(error.retryAfterMs / 1000)),
    });
  }
  if (error instanceof NotFound) return json({ error: "not_found" }, 404);
  if (error instanceof UpstreamError) return json({ error: "upstream_failed" }, 502);

  // the request id goes back to the client, so a bug report can point at the exact log line
  log.error("unhandled_error", { requestId, error });
  return json({ error: "internal", requestId }, 500);
}

interface Ctx<P> {
  req: Request;
  viewer: Viewer;
  params: P;
  requestId: string;
}

interface HttpOptions {
  secureCookies: boolean;
  logger: Logger;
  clock?: Clock;
  version?: string;
  newId?: () => string;
}

export function createHttpApi(app: App, opts: HttpOptions) {
  const clock = opts.clock ?? Date.now;
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const startedAt = clock();

  const cookie = (value: string, maxAgeSec: number, name = SESSION_COOKIE) =>
    [
      `${name}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAgeSec}`,
      opts.secureCookies ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");
  const dropCookie = cookie("", 0);

  // every route goes through this: request id -> who's calling -> run -> map errors ->
  // clean up a dead cookie -> 1 structured log line. same observability on every endpoint for free
  const route =
    <P = void>(handler: (ctx: Ctx<P>) => Response | Promise<Response>) =>
    async (req: Request, params: P) => {
      const t0 = clock();
      const incoming = req.headers.get("x-request-id");
      const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : newId();
      const viewer = await app.resolveSession(readToken(req));

      let res: Response;
      try {
        res = await handler({ req, viewer, params, requestId });
      } catch (error) {
        res = fail(error, opts.logger, requestId);
      }
      if (viewer.stale && !res.headers.has("set-cookie")) res.headers.append("set-cookie", dropCookie);

      const durationMs = clock() - t0;
      res.headers.set("x-request-id", requestId);
      res.headers.set("server-timing", `app;dur=${durationMs}`);
      opts.logger.info("http_request", {
        requestId,
        method: req.method,
        path: new URL(req.url).pathname,
        status: res.status,
        durationMs,
        role: viewer.role,
      });
      return res;
    };

  const slug = (value: string) => {
    const parsed = Slug.safeParse(value);
    if (!parsed.success) throw new NotFound(`bad slug`);
    return parsed.data.toLowerCase();
  };

  return {
    // for uptime checks + load balancers. no auth, no secrets, no upstream calls
    health: route(() =>
      json({ status: "ok", version: opts.version ?? "dev", uptimeS: Math.round((clock() - startedAt) / 1000) }),
    ),

    flags: route(({ req, viewer }) => {
      const existing = readCookie(req, BUCKET_COOKIE);
      const bucket = existing && REQUEST_ID.test(existing) ? existing : newId();
      const headers: Record<string, string> =
        existing === bucket ? {} : { "set-cookie": cookie(bucket, 60 * 60 * 24 * 365, BUCKET_COOKIE) };
      return json(app.flagsFor(viewer.role, bucket), 200, headers);
    }),

    me: route(({ viewer }) =>
      json({ role: viewer.role, permissions: permissionsOf(viewer.role), expiresAt: viewer.expiresAt }),
    ),

    openSession: route(async ({ req }) => {
      // json only. a plain html form can't send this, so no cheap CSRF on login
      if (!req.headers.get("content-type")?.includes("application/json")) {
        return json({ error: "json_only" }, 415);
      }
      const body = SessionBody.safeParse(await req.json().catch(() => null));
      if (!body.success) return json({ error: "bad_request" }, 400);

      const { token, session } = await app.openSession(body.data.accessCode, clientKey(req));
      return json({ role: session.role, permissions: permissionsOf(session.role), expiresAt: session.expiresAt }, 201, {
        "set-cookie": cookie(token, SESSION_TTL_MS / 1000),
      });
    }),

    closeSession: route(() => json({ ok: true }, 200, { "set-cookie": dropCookie })),

    profile: route(({ viewer }) => json(app.getProfile(viewer.role))),

    contact: route(({ viewer }) => json(app.revealContact(viewer.role))),

    audit: route(({ viewer }) => json(app.readAudit(viewer.role))),

    pokemonList: route(async ({ req, viewer }) => {
      const limit = Number(new URL(req.url).searchParams.get("limit") ?? GEN_ONE_COUNT);
      const list = await app.listPokemon(viewer.role, Number.isFinite(limit) ? limit : GEN_ONE_COUNT);
      return json(list, 200, BROWSER_CACHE);
    }),

    pokemon: route<{ name: string }>(async ({ viewer, params }) =>
      json(await app.pokemonDetails(viewer.role, slug(params.name)), 200, BROWSER_CACHE),
    ),

    move: route<{ name: string }>(async ({ viewer, params }) =>
      json(await app.move(viewer.role, slug(params.name)), 200, BROWSER_CACHE),
    ),
  };
}

export type HttpApi = ReturnType<typeof createHttpApi>;
