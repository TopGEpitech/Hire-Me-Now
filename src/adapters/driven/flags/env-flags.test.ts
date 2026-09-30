import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS } from "@/core/domain/flags/flags";
import { EnvFlags } from "./env-flags";

describe("EnvFlags", () => {
  it("uses the defaults when nothing is set", () => {
    expect(new EnvFlags(undefined).rules()).toEqual(DEFAULT_FLAGS);
  });

  it("overrides only what's in the env", () => {
    const rules = new EnvFlags('{"shiny-sprites":{"enabled":true,"rolloutPercent":10}}').rules();
    expect(rules["shiny-sprites"]).toEqual({ enabled: true, rolloutPercent: 10 });
    expect(rules["smart-ai"]).toEqual(DEFAULT_FLAGS["smart-ai"]);
  });

  it("falls back + warns on garbage instead of crashing", () => {
    const warnings: string[] = [];
    expect(new EnvFlags("{nope", (m) => warnings.push(m)).rules()).toEqual(DEFAULT_FLAGS);
    expect(new EnvFlags('{"smart-ai":{"enabled":"yes"}}', (m) => warnings.push(m)).rules()).toEqual(DEFAULT_FLAGS);
    expect(new EnvFlags('{"made-up":{"enabled":true}}', (m) => warnings.push(m)).rules()).toEqual(DEFAULT_FLAGS);
    expect(warnings).toHaveLength(3);
  });
});
