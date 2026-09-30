import { z } from "zod";
import { MemoryAuditLog } from "@/adapters/driven/audit/memory-audit-log";
import { EnvContactDirectory } from "@/adapters/driven/contact/env-contact-directory";
import { staticProfile } from "@/adapters/driven/content/resume";
import { PokeApiCatalog } from "@/adapters/driven/pokeapi/pokeapi-catalog";
import { EnvAccessCodes } from "@/adapters/driven/security/env-access-codes";
import { HmacTokenService } from "@/adapters/driven/security/hmac-token-service";
import { CompositeTokenService, OidcTokenVerifier } from "@/adapters/driven/security/oidc-token-verifier";
import { MemoryRateLimiter } from "@/adapters/driven/security/memory-rate-limiter";
import { createHttpApi } from "@/adapters/driving/http/http-api";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeCoach } from "@/adapters/driven/coach/claude-coach";
import { createApp } from "@/core/application/app";
import { EnvFlags } from "@/adapters/driven/flags/env-flags";
import { FanoutPublisher, SignedWebhookPublisher, SlackPublisher } from "@/adapters/driven/events/publishers";
import { JsonLogger } from "@/adapters/driven/logging/json-logger";

// Composition root. The ONLY file that knows which adapter plugs into which port.
// Want redis for rate limits or postgres for the audit log? change it here, nowhere else

const blankIsUnset = (schema: z.ZodString) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  AUTH_SECRET: blankIsUnset(z.string().min(32, "AUTH_SECRET: 32 chars min")),
  RECRUITER_ACCESS_CODE: blankIsUnset(z.string().min(8, "RECRUITER_ACCESS_CODE: 8 chars min")),
  ADMIN_ACCESS_CODE: blankIsUnset(z.string().min(12, "ADMIN_ACCESS_CODE: 12 chars min")),
  CONTACT_PHONE: blankIsUnset(z.string()),
  CONTACT_WHATSAPP: blankIsUnset(z.string()),
  FEATURE_FLAGS: blankIsUnset(z.string()),
  VERCEL_GIT_COMMIT_SHA: blankIsUnset(z.string()),
  SLACK_WEBHOOK_URL: blankIsUnset(z.string().url()),
  WEBHOOK_URL: blankIsUnset(z.string().url()),
  ANTHROPIC_API_KEY: blankIsUnset(z.string()),
  OIDC_ISSUER: blankIsUnset(z.string().url()),
  OIDC_AUDIENCE: blankIsUnset(z.string()),
  WEBHOOK_SECRET: blankIsUnset(z.string().min(16, "WEBHOOK_SECRET: 16 chars min")),
});

// bad config = crash at boot with a clear message, not a weird 500 3 days later
const env = Env.parse(process.env);

const out = process.env.LOG_STREAM === "stderr" ? process.stderr : process.stdout;
const logger = new JsonLogger((line) => out.write(`${line}\n`), Date.now, { service: "hire-me" });

if (!env.AUTH_SECRET && env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  logger.warn("auth_secret_missing", { note: "using a random one, sessions won't survive a restart" });
}

// only the targets that are configured. none = events go nowhere, that's fine
const eventTargets = [
  ...(env.SLACK_WEBHOOK_URL ? [{ name: "slack", publisher: new SlackPublisher(env.SLACK_WEBHOOK_URL) }] : []),
  ...(env.WEBHOOK_URL && env.WEBHOOK_SECRET
    ? [{ name: "webhook", publisher: new SignedWebhookPublisher(env.WEBHOOK_URL, env.WEBHOOK_SECRET) }]
    : []),
];

const hmacTokens = env.AUTH_SECRET ? new HmacTokenService(env.AUTH_SECRET) : HmacTokenService.withRandomSecret();
// keycloak is optional. set OIDC_ISSUER + OIDC_AUDIENCE and bearer tokens from the realm just work
const tokens =
  env.OIDC_ISSUER && env.OIDC_AUDIENCE
    ? new CompositeTokenService(hmacTokens, [
        new OidcTokenVerifier({ issuer: env.OIDC_ISSUER, audience: env.OIDC_AUDIENCE }),
      ])
    : hmacTokens;

// no key = no AI calls at all, the coach answers with its rule engine. never a fake answer
const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
const coachModels = anthropic
  ? [
      // server-side fallback covers safety refusals, the 2nd model covers everything else (timeouts, 5xx, bad json)
      new ClaudeCoach(anthropic, "claude-opus-5-5", { serverFallback: true }),
      new ClaudeCoach(anthropic, "claude-sonnet-5-5"),
    ]
  : [];

export const app = createApp({
  catalog: new PokeApiCatalog(),
  tokens,
  // a role with no code in env just can't be reached. fail closed
  codes: new EnvAccessCodes({ recruiter: env.RECRUITER_ACCESS_CODE, admin: env.ADMIN_ACCESS_CODE }),
  contacts: new EnvContactDirectory({ phone: env.CONTACT_PHONE, whatsapp: env.CONTACT_WHATSAPP }),
  profile: staticProfile,
  audit: new MemoryAuditLog(200),
  limiter: new MemoryRateLimiter(5, 60_000),
  events: new FanoutPublisher(eventTargets, logger),
  coachModels,
  logger,
  flags: new EnvFlags(env.FEATURE_FLAGS, (msg) => logger.warn("feature_flags_invalid", { msg })),
  clock: Date.now,
});

export const http = createHttpApi(app, {
  secureCookies: env.NODE_ENV === "production",
  logger,
  hireLimiter: new MemoryRateLimiter(3, 60_000),
  coachLimiter: new MemoryRateLimiter(5, 60_000),
  version: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
});
