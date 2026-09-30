// Ports = what the core needs from the outside, written in the core's own words.
// Adapters (src/adapters/driven/*) implement them. The core never imports an adapter.

import type { Role } from "../domain/access/rbac";
import type { FlagRules } from "../domain/flags/flags";
import type { Move, Pokemon, PokemonDetails, PokemonSummary, TeamMember } from "../domain/pokemon/pokemon";
import type { PrivateContact, Profile } from "../domain/profile/profile";

export interface PokemonCatalog {
  list(limit: number): Promise<PokemonSummary[]>;
  get(nameOrId: string): Promise<Pokemon>;
  details(name: string): Promise<PokemonDetails>;
  move(name: string): Promise<Move>;
}

export interface TeamStore {
  load(): TeamMember[];
  save(team: TeamMember[]): void;
  clear(): void;
}

export interface Session {
  role: Role;
  expiresAt: number;
}

export interface TokenService {
  sign(session: Session): Promise<string>;
  // null if the token is fake, tampered or garbage. expiry is checked by the use case, not here
  verify(token: string): Promise<Session | null>;
}

export interface AccessCodes {
  roleFor(code: string): Role | null;
}

export interface ContactDirectory {
  privateContact(): PrivateContact;
}

export interface ProfileSource {
  profile(): Profile;
}

export interface RateLimiter {
  hit(key: string): { allowed: boolean; retryAfterMs: number };
}

export interface AuditEntry {
  at: number;
  role: Role;
  action: string;
  allowed: boolean;
}

export interface AuditLog {
  record(entry: AuditEntry): void;
  recent(limit: number): AuditEntry[];
}

export interface FlagSource {
  rules(): FlagRules;
}

// structured logs. 1 event name + fields, the adapter decides the format (json lines here)
export interface Logger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export type Clock = () => number;
export type Random = () => number;
