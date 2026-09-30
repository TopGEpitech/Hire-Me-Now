import { z } from "zod";
import { MemoryAuditLog } from "@/adapters/driven/audit/memory-audit-log";
import { EnvContactDirectory } from "@/adapters/driven/contact/env-contact-directory";
import { staticProfile } from "@/adapters/driven/content/resume";
import { PokeApiCatalog } from "@/adapters/driven/pokeapi/pokeapi-catalog";
import { EnvAccessCodes } from "@/adapters/driven/security/env-access-codes";
import { HmacTokenService } from "@/adapters/driven/security/hmac-token-service";
import { MemoryRateLimiter } from "@/adapters/driven/security/memory-rate-limiter";
import { createHttpApi } from "@/adapters/driving/http/http-api";
import { createApp } from "@/core/application/app";

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
});

// bad config = crash at boot with a clear message, not a weird 500 3 days later
const env = Env.parse(process.env);

if (!env.AUTH_SECRET && env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[auth] no AUTH_SECRET, using a random one. sessions won't survive a restart");
}

export const app = createApp({
  catalog: new PokeApiCatalog(),
  tokens: env.AUTH_SECRET ? new HmacTokenService(env.AUTH_SECRET) : HmacTokenService.withRandomSecret(),
  // a role with no code in env just can't be reached. fail closed
  codes: new EnvAccessCodes({ recruiter: env.RECRUITER_ACCESS_CODE, admin: env.ADMIN_ACCESS_CODE }),
  contacts: new EnvContactDirectory({ phone: env.CONTACT_PHONE, whatsapp: env.CONTACT_WHATSAPP }),
  profile: staticProfile,
  audit: new MemoryAuditLog(200),
  limiter: new MemoryRateLimiter(5, 60_000),
  clock: Date.now,
});

export const http = createHttpApi(app, { secureCookies: env.NODE_ENV === "production" });
