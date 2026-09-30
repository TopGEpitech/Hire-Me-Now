import type { Role } from "../../domain/access/rbac";
import { InvalidAccessCode, TooManyAttempts } from "../errors";
import type { AccessCodes, AuditLog, Clock, EventPublisher, RateLimiter, TokenService } from "../ports";

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface Viewer {
  role: Role;
  expiresAt: number | null;
  // had a token but it was bad or expired, so the http layer should drop the cookie
  stale: boolean;
}

const VISITOR: Viewer = { role: "visitor", expiresAt: null, stale: false };

interface OpenSessionDeps {
  codes: AccessCodes;
  tokens: TokenService;
  limiter: RateLimiter;
  audit: AuditLog;
  events: EventPublisher;
  clock: Clock;
}

export function openSession(deps: OpenSessionDeps) {
  return async (code: string, clientKey: string) => {
    // rate limit first, before we even look at the code. brute force gets nothing
    const gate = deps.limiter.hit(clientKey);
    if (!gate.allowed) throw new TooManyAttempts(gate.retryAfterMs);

    const role = deps.codes.roleFor(code);
    deps.audit.record({ at: deps.clock(), role: role ?? "visitor", action: "session:open", allowed: !!role });
    if (!role) throw new InvalidAccessCode();

    const session = { role, expiresAt: deps.clock() + SESSION_TTL_MS };
    // a recruiter just logged in = i want to know. not awaited, a slow slack never blocks a login
    deps.events.publish({ type: "session.opened", at: deps.clock(), role }).catch(() => {});
    return { token: await deps.tokens.sign(session), session };
  };
}

export function resolveSession(deps: { tokens: TokenService; clock: Clock }) {
  return async (token: string | null | undefined): Promise<Viewer> => {
    if (!token) return VISITOR;
    const session = await deps.tokens.verify(token);
    if (!session || session.expiresAt <= deps.clock()) return { ...VISITOR, stale: true };
    return { role: session.role, expiresAt: session.expiresAt, stale: false };
  };
}
