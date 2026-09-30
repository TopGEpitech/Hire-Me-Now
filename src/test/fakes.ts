import { MemoryAuditLog } from "@/adapters/driven/audit/memory-audit-log";
import { EnvContactDirectory } from "@/adapters/driven/contact/env-contact-directory";
import { EnvFlags } from "@/adapters/driven/flags/env-flags";
import { resume } from "@/adapters/driven/content/resume";
import { EnvAccessCodes } from "@/adapters/driven/security/env-access-codes";
import { HmacTokenService } from "@/adapters/driven/security/hmac-token-service";
import { MemoryRateLimiter } from "@/adapters/driven/security/memory-rate-limiter";
import { createApp } from "@/core/application/app";
import { NotFound } from "@/core/application/errors";
import type { DomainEvent, PokemonCatalog } from "@/core/application/ports";
import type { Move, Pokemon, PokemonDetails } from "@/core/domain/pokemon/pokemon";

export const CODES = { recruiter: "recruiter-test-code", admin: "admin-test-code-123" };
export const SECRET = "x".repeat(40);

export function fakePokemon(id: number, name: string, over: Partial<Pokemon> = {}): Pokemon {
  return {
    id,
    name,
    sprite: `/${id}.png`,
    types: ["normal"],
    heightM: 1,
    weightKg: 10,
    abilities: [],
    stats: { hp: 50, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 },
    moveNames: ["tackle", "growl", "quick-attack", "slam", "body-slam", "rest"],
    ...over,
  };
}

// in memory catalog, 151 fake mons, every move is normal/50
export class FakeCatalog implements PokemonCatalog {
  calls: string[] = [];
  private readonly mons = Array.from({ length: 151 }, (_, i) => fakePokemon(i + 1, `mon-${i + 1}`));

  async list(limit: number) {
    this.calls.push(`list:${limit}`);
    return this.mons.slice(0, limit).map(({ id, name, sprite }) => ({ id, name, sprite }));
  }

  async get(nameOrId: string) {
    this.calls.push(`get:${nameOrId}`);
    const found = this.mons.find((m) => m.name === nameOrId || String(m.id) === nameOrId);
    if (!found) throw new NotFound(nameOrId);
    return found;
  }

  async details(name: string): Promise<PokemonDetails> {
    return { ...(await this.get(name)), description: "fake", evolutions: [] };
  }

  async move(name: string): Promise<Move> {
    this.calls.push(`move:${name}`);
    return { name, type: "normal", power: 50 };
  }
}

export function testApp(opts: { now?: () => number } = {}) {
  let now = 1_700_000_000_000;
  const clock = opts.now ?? (() => now);
  const audit = new MemoryAuditLog(50);
  const catalog = new FakeCatalog();
  const events: DomainEvent[] = [];
  const app = createApp({
    catalog,
    tokens: new HmacTokenService(SECRET),
    codes: new EnvAccessCodes(CODES),
    contacts: new EnvContactDirectory({ phone: "+33 0 00 00 00 00", whatsapp: undefined }),
    profile: { profile: () => resume },
    audit,
    limiter: new MemoryRateLimiter(5, 60_000, clock),
    events: { publish: async (e) => void events.push(e) },
    flags: new EnvFlags('{"shiny-sprites":{"enabled":true,"roles":["admin"]}}'),
    clock,
  });
  return { app, audit, catalog, events, tick: (ms: number) => (now += ms) };
}
