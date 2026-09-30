import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

// typed client generated from openapi/openapi.yaml. wrong path, wrong param, wrong body = compile error
export type HireMeClient = ReturnType<typeof createHireMeClient>;
export type Schemas = components["schemas"];

export function createHireMeClient(opts: { baseUrl?: string; token?: string; fetch?: typeof fetch } = {}) {
  return createClient<paths>({
    baseUrl: opts.baseUrl ?? "",
    credentials: "same-origin",
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : undefined,
    fetch: opts.fetch,
  });
}
