import { can, type Permission, type Role } from "../../domain/access/rbac";
import { AccessDenied } from "../errors";
import type { AuditLog, Clock } from "../ports";

// reading the pokedex 500 times is not news. reading a phone number is
const ALWAYS_AUDITED = new Set<Permission>(["contact:read", "audit:read"]);

export type Authorize = (role: Role, permission: Permission) => void;

export function makeAuthorize(deps: { audit: AuditLog; clock: Clock }): Authorize {
  return (role, permission) => {
    const allowed = can(role, permission);
    if (!allowed || ALWAYS_AUDITED.has(permission)) {
      deps.audit.record({ at: deps.clock(), role, action: permission, allowed });
    }
    if (!allowed) throw new AccessDenied(permission, role);
  };
}
