import { NotFound, UpstreamError } from "@/core/application/errors";
import type { PokemonCatalog } from "@/core/application/ports";
import type { Pokemon, PokemonDetails } from "@/core/domain/pokemon/pokemon";
import { createHireMeClient, type HireMeClient } from "@/sdk/client";

// same port as PokeApiCatalog, but for the browser: it talks to OUR api, through the SDK that's
// generated from the openapi spec. the use cases can't tell the difference + that's the point of a port
export class ApiPokemonCatalog implements PokemonCatalog {
  constructor(private readonly api: HireMeClient = createHireMeClient()) {}

  private unwrap<T>(res: { data?: T; response: Response }, what: string): T {
    if (res.response.status === 404) throw new NotFound(what);
    if (!res.response.ok || res.data === undefined) throw new UpstreamError(`${what} -> ${res.response.status}`);
    return res.data;
  }

  async list(limit: number) {
    return this.unwrap(await this.api.GET("/api/pokemon", { params: { query: { limit } } }), "pokemon list");
  }

  // details is a superset of Pokemon so 1 endpoint covers both
  get(nameOrId: string): Promise<Pokemon> {
    return this.details(nameOrId);
  }

  async details(name: string): Promise<PokemonDetails> {
    return this.unwrap(await this.api.GET("/api/pokemon/{name}", { params: { path: { name } } }), name);
  }

  async move(name: string) {
    return this.unwrap(await this.api.GET("/api/moves/{name}", { params: { path: { name } } }), name);
  }
}
