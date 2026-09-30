import { createHash, timingSafeEqual } from "node:crypto";
import type { AccessCodes } from "@/core/application/ports";
import type { Role } from "@/core/domain/access/rbac";

const digest = (value: string) => createHash("sha256").update(value).digest();

// codes live in env vars, never in the repo.
// hashing first = same length buffers, so timingSafeEqual doesn't throw + no length leak
export class EnvAccessCodes implements AccessCodes {
  private readonly entries: Array<{ role: Role; hash: Buffer }>;

  constructor(codes: Partial<Record<Exclude<Role, "visitor">, string | undefined>>) {
    this.entries = Object.entries(codes)
      .filter((e): e is [Exclude<Role, "visitor">, string] => !!e[1])
      .map(([role, code]) => ({ role, hash: digest(code) }));
  }

  roleFor(code: string): Role | null {
    const candidate = digest(code);
    // check every entry, don't stop early. keeps the timing flat
    let match: Role | null = null;
    for (const { role, hash } of this.entries) {
      if (timingSafeEqual(candidate, hash)) match = role;
    }
    return match;
  }
}
