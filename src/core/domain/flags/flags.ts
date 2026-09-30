import type { Role } from "../access/rbac";

// feature flags the way i run them at work: on/off, per role, + a % rollout for canaries

export const FLAGS = ["smart-ai", "shiny-sprites"] as const;
export type FlagName = (typeof FLAGS)[number];

export interface FlagRule {
  enabled: boolean;
  // 0..100. same visitor always lands in the same bucket, so a canary doesn't flicker
  rolloutPercent?: number;
  // empty or missing = every role
  roles?: Role[];
}

export type FlagRules = Record<FlagName, FlagRule>;

export const DEFAULT_FLAGS: FlagRules = {
  "smart-ai": { enabled: true },
  "shiny-sprites": { enabled: false },
};

// fnv-1a. tiny, fast, good enough spread for bucketing. not crypto, doesn't need to be
export function bucketOf(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

export function isEnabled(flag: FlagName, rule: FlagRule, ctx: { role: Role; bucketKey: string }) {
  if (!rule.enabled) return false;
  if (rule.roles?.length && !rule.roles.includes(ctx.role)) return false;
  if (rule.rolloutPercent === undefined) return true;
  // flag name in the key so 2 flags at 50% don't hit the exact same half of people
  return bucketOf(`${flag}:${ctx.bucketKey}`) < rule.rolloutPercent;
}

export function evaluateFlags(rules: FlagRules, ctx: { role: Role; bucketKey: string }) {
  return Object.fromEntries(FLAGS.map((f) => [f, isEnabled(f, rules[f], ctx)])) as Record<FlagName, boolean>;
}
