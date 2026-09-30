import { z } from "zod";
import type { App } from "@/core/application/app";
import { AccessDenied, InvalidAccessCode, NotFound, TooManyAttempts, UpstreamError } from "@/core/application/errors";
import { SESSION_TTL_MS, type Viewer } from "@/core/application/use-cases/sessions";
import { permissionsOf } from "@/core/domain/access/rbac";
import { GEN_ONE_COUNT } from "@/core/domain/pokemon/pokemon";

// Driving adapter: turns http into use case calls + use case errors into status codes.
// the next.js route files are 1 liners that point here, so all of this is testable with a plain Request

export const SESSION_COOKIE = "hm_session";

const SessionBody = z.object({ accessCode: z.string().trim().min(1).max(128) });
const Slug = z.string().regex(/^[a-z0-9-]{1,40}$/i);

// pokemon data is the same for every role that can read it, so the browser can keep it a bit
const BROWSER_CACHE = { "cache-control": "private, max-age=3600" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;

  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

// only used as a rate limit key, never stored
const clientKey = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

function fail(error: unknown): Response {
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

  console.error("[api] unexpected", error);
  return json({ error: "internal" }, 500);
}

interface Ctx<P> {
  req: Request;
  viewer: Viewer;
  params: P;
}

export function createHttpApi(app: App, opts: { secureCookies: boolean }) {
  const cookie = (value: string, maxAgeSec: number) =>
    [
      `${SESSION_COOKIE}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAgeSec}`,
      opts.secureCookies ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");
  const dropCookie = cookie("", 0);

  // every route goes through this: who's calling -> run -> map errors -> clean up a dead cookie
  const route =
    <P = void>(handler: (ctx: Ctx<P>) => Response | Promise<Response>) =>
    async (req: Request, params: P) => {
      const viewer = await app.resolveSession(readToken(req));
      let res: Response;
      try {
        res = await handler({ req, viewer, params });
      } catch (error) {
        res = fail(error);
      }
      if (viewer.stale && !res.headers.has("set-cookie")) res.headers.append("set-cookie", dropCookie);
      return res;
    };

  const slug = (value: string) => {
    const parsed = Slug.safeParse(value);
    if (!parsed.success) throw new NotFound(`bad slug`);
    return parsed.data.toLowerCase();
  };

  return {
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
