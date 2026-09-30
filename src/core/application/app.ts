import type { Role } from "../domain/access/rbac";
import { evaluateFlags } from "../domain/flags/flags";
import type { BattleEvent } from "../domain/battle/engine";
import { GEN_ONE_COUNT, type TeamMember } from "../domain/pokemon/pokemon";
import { KANTO, planTour } from "../domain/routing/route";
import type {
  AccessCodes,
  AuditLog,
  Clock,
  ContactDirectory,
  Logger,
  EventPublisher,
  FlagSource,
  PokemonCatalog,
  ProfileSource,
  RateLimiter,
  TokenService,
} from "./ports";
import { NotFound } from "./errors";
import { makeAuthorize } from "./use-cases/authorize";
import { coachTeam, type CoachEvent, type CoachModel } from "./use-cases/coach-team";
import { openSession, resolveSession } from "./use-cases/sessions";

export interface AppDeps {
  catalog: PokemonCatalog;
  tokens: TokenService;
  codes: AccessCodes;
  contacts: ContactDirectory;
  profile: ProfileSource;
  audit: AuditLog;
  limiter: RateLimiter;
  flags: FlagSource;
  events: EventPublisher;
  coachModels: CoachModel[];
  logger: Logger;
  clock: Clock;
}

// every entry point takes the caller's role first. no role, no call.
// the http layer, the pages, the tests: they all go through here
export function createApp(deps: AppDeps) {
  const authorize = makeAuthorize(deps);
  const coach = coachTeam({ models: deps.coachModels, logger: deps.logger });

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

    // no permission needed: flags only change how things look/behave, never what you can access
    flagsFor(role: Role, bucketKey: string) {
      return evaluateFlags(deps.flags.rules(), { role, bucketKey });
    },

    // the HIRE button on the home page. rate limited by the http layer
    async recordHireClick(role: Role) {
      await deps.events.publish({ type: "hire.clicked", at: deps.clock(), role });
    },

    // shortest gym tour from a town. pure domain, no permission needed (public data)
    planGymTour(fromId: string) {
      const start = KANTO.find((s) => s.id === fromId);
      if (!start) throw new NotFound(`no town "${fromId}"`);
      return planTour(start, KANTO);
    },

    async coachTeam(role: Role, team: TeamMember[], log: BattleEvent[], emit: (e: CoachEvent) => void) {
      authorize(role, "coach:use");
      await coach(team, log, emit);
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
