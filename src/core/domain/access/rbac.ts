export const ROLES = ["visitor", "recruiter", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ["profile:read", "pokedex:read", "contact:read", "audit:read"] as const;
export type Permission = (typeof PERMISSIONS)[number];

// the only place that says who can do what.
// not in the list = denied. no "admin bypasses everything" shortcut on purpose
export const POLICY: Record<Role, readonly Permission[]> = {
  visitor: ["profile:read", "pokedex:read"],
  recruiter: ["profile:read", "pokedex:read", "contact:read"],
  admin: ["profile:read", "pokedex:read", "contact:read", "audit:read"],
};

export const can = (role: Role, permission: Permission) => POLICY[role].includes(permission);

export const permissionsOf = (role: Role): Permission[] => [...POLICY[role]];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);
