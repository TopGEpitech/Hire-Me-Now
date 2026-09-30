import { z } from "zod";
import type { FlagSource } from "@/core/application/ports";
import { ROLES } from "@/core/domain/access/rbac";
import { DEFAULT_FLAGS, FLAGS, type FlagRules } from "@/core/domain/flags/flags";

const Rule = z.object({
  enabled: z.boolean(),
  rolloutPercent: z.number().min(0).max(100).optional(),
  roles: z.array(z.enum(ROLES)).optional(),
});
const Overrides = z.record(z.enum(FLAGS), Rule);

// FEATURE_FLAGS='{"smart-ai":{"enabled":true,"rolloutPercent":20}}'
// flip a flag in the host's env, redeploy, done. no code change.
// broken json = defaults + a warning, never a crash (a typo in a flag shouldn't take the site down)
export class EnvFlags implements FlagSource {
  private readonly merged: FlagRules;

  constructor(raw: string | undefined, onInvalid: (msg: string) => void = () => {}) {
    let overrides: Partial<FlagRules> = {};
    if (raw) {
      try {
        const parsed = Overrides.safeParse(JSON.parse(raw));
        if (parsed.success) overrides = parsed.data;
        else onInvalid("FEATURE_FLAGS doesn't match the schema, using defaults");
      } catch {
        onInvalid("FEATURE_FLAGS isn't valid json, using defaults");
      }
    }
    this.merged = { ...DEFAULT_FLAGS, ...overrides };
  }

  rules() {
    return this.merged;
  }
}
