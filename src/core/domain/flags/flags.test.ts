import { describe, expect, it } from "vitest";
import { bucketOf, evaluateFlags, isEnabled } from "./flags";

const visitor = { role: "visitor" as const, bucketKey: "abc" };

describe("feature flags", () => {
  it("off means off, whatever else is set", () => {
    expect(isEnabled("smart-ai", { enabled: false, rolloutPercent: 100 }, visitor)).toBe(false);
  });

  it("can target roles", () => {
    const rule = { enabled: true, roles: ["admin" as const] };
    expect(isEnabled("smart-ai", rule, visitor)).toBe(false);
    expect(isEnabled("smart-ai", rule, { ...visitor, role: "admin" })).toBe(true);
  });

  it("keeps the same person in the same bucket (no flickering canary)", () => {
    const rule = { enabled: true, rolloutPercent: 50 };
    const first = isEnabled("smart-ai", rule, visitor);
    for (let i = 0; i < 20; i++) expect(isEnabled("smart-ai", rule, visitor)).toBe(first);
  });

  it("rolls out to roughly the right %", () => {
    const rule = { enabled: true, rolloutPercent: 25 };
    let on = 0;
    for (let i = 0; i < 4000; i++) if (isEnabled("smart-ai", rule, { role: "visitor", bucketKey: `user-${i}` })) on++;
    expect(on / 4000).toBeGreaterThan(0.2);
    expect(on / 4000).toBeLessThan(0.3);
  });

  it("0% and 100% are exact", () => {
    expect(isEnabled("smart-ai", { enabled: true, rolloutPercent: 0 }, visitor)).toBe(false);
    expect(isEnabled("smart-ai", { enabled: true, rolloutPercent: 100 }, visitor)).toBe(true);
  });

  it("buckets are 0..99", () => {
    for (const k of ["", "a", "zzzz", "🔥"]) expect(bucketOf(k)).toBeGreaterThanOrEqual(0);
    for (const k of ["", "a", "zzzz", "🔥"]) expect(bucketOf(k)).toBeLessThan(100);
  });

  it("evaluates every flag", () => {
    const out = evaluateFlags({ "smart-ai": { enabled: true }, "shiny-sprites": { enabled: false } }, visitor);
    expect(out).toEqual({ "smart-ai": true, "shiny-sprites": false });
  });
});
