import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

// the spec is the contract. this test fails if code + spec drift: a route without a spec entry,
// a spec entry without a route, or a method that exists on 1 side only

const API_DIR = "src/app/api";
const spec = parse(readFileSync("openapi/openapi.yaml", "utf8")) as { paths: Record<string, Record<string, unknown>> };

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? routeFiles(p) : f === "route.ts" ? [p] : [];
  });
}

const toSpecPath = (file: string) =>
  file
    .replace(/^src\/app/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\[(\w+)\]/g, "{$1}");

const METHODS = ["get", "post", "put", "patch", "delete"];

describe("openapi contract", () => {
  const routes = Object.fromEntries(
    routeFiles(API_DIR).map((f) => {
      const src = readFileSync(f, "utf8");
      return [toSpecPath(f), METHODS.filter((m) => new RegExp(`export const ${m.toUpperCase()}\\b`).test(src))];
    }),
  );

  it("every route is in the spec", () => {
    expect(Object.keys(routes).filter((p) => !spec.paths[p])).toEqual([]);
  });

  it("every spec path has a route", () => {
    expect(Object.keys(spec.paths).filter((p) => !routes[p])).toEqual([]);
  });

  it("methods match on both sides", () => {
    for (const [path, methods] of Object.entries(routes)) {
      const inSpec = Object.keys(spec.paths[path] ?? {}).filter((k) => METHODS.includes(k));
      expect({ path, methods: [...methods].sort() }).toEqual({ path, methods: inSpec.sort() });
    }
  });

  it("every operation has an operationId (the SDK needs them)", () => {
    const missing = Object.entries(spec.paths).flatMap(([p, ops]) =>
      Object.entries(ops)
        .filter(([m, op]) => METHODS.includes(m) && !(op as { operationId?: string }).operationId)
        .map(([m]) => `${m} ${p}`),
    );
    expect(missing).toEqual([]);
  });
});
