import { describe, expect, it } from "vitest";
import { PERMISSIONS, POLICY, ROLES, can, isRole } from "./rbac";

describe("rbac policy", () => {
  it("keeps visitors away from private stuff", () => {
    expect(can("visitor", "profile:read")).toBe(true);
    expect(can("visitor", "contact:read")).toBe(false);
    expect(can("visitor", "audit:read")).toBe(false);
  });

  it("lets recruiters get my contact but not the audit log", () => {
    expect(can("recruiter", "contact:read")).toBe(true);
    expect(can("recruiter", "audit:read")).toBe(false);
  });

  it("gives admin everything", () => {
    for (const p of PERMISSIONS) expect(can("admin", p)).toBe(true);
  });

  it("has no dead permission nobody can use", () => {
    for (const p of PERMISSIONS) expect(ROLES.some((r) => POLICY[r].includes(p))).toBe(true);
  });

  it("only knows the real roles", () => {
    expect(isRole("recruiter")).toBe(true);
    expect(isRole("root")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
