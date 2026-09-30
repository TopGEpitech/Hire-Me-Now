import type { Role } from "../domain/access/rbac";
import { GEN_ONE_COUNT } from "../domain/pokemon/pokemon";
import type {
  AccessCodes,
  AuditLog,
  Clock,
  ContactDirectory,
  PokemonCatalog,
  ProfileSource,
  RateLimiter,
  TokenService,
} from "./ports";
import { makeAuthorize } from "./use-cases/authorize";
import { openSession, resolveSession } from "./use-cases/sessions";

export interface AppDeps {
  catalog: PokemonCatalog;
  tokens: TokenService;
  codes: AccessCodes;
  contacts: ContactDirectory;
  profile: ProfileSource;
  audit: AuditLog;
  limiter: RateLimiter;
  clock: Clock;
}

// every entry point takes the caller's role first. no role, no call.
// the http layer, the pages, the tests: they all go through here
export function createApp(deps: AppDeps) {
  const authorize = makeAuthorize(deps);

  return {
    openSession: openSession(deps),
    resolveSession: resolveSession(deps),

    getProfile(role: Role) {
      authorize(role, "profile:read");
      return deps.profile.profile();
    },

    revealContact(role: Role) {
      authorize(role, "contact:read");
      return { email: deps.profile.profile().email, ...deps.contacts.privateContact() };
    },

    readAudit(role: Role, limit = 50) {
      authorize(role, "audit:read");
      return deps.audit.recent(limit);
    },

    listPokemon(role: Role, limit = GEN_ONE_COUNT) {
      authorize(role, "pokedex:read");
      return deps.catalog.list(Math.min(Math.max(1, Math.floor(limit)), GEN_ONE_COUNT));
    },

    pokemonDetails(role: Role, name: string) {
      authorize(role, "pokedex:read");
      return deps.catalog.details(name);
    },

    move(role: Role, name: string) {
      authorize(role, "pokedex:read");
      return deps.catalog.move(name);
    },
  };
}

export type App = ReturnType<typeof createApp>;
