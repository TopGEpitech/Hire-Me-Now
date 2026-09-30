import { NotFound, UpstreamError } from "@/core/application/errors";
import type { PokemonCatalog } from "@/core/application/ports";
import type { Move, Pokemon, PokemonDetails, PokemonSummary } from "@/core/domain/pokemon/pokemon";

// same port as PokeApiCatalog, but for the browser: it talks to OUR api, not pokeapi.
// the use cases can't tell the difference + that's exactly the point of a port
export class ApiPokemonCatalog implements PokemonCatalog {
  constructor(
    private readonly baseUrl = "/api",
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async getJson<T>(path: string): Promise<T> {
    const res = await this.fetcher(`${this.baseUrl}${path}`, { credentials: "same-origin" });
    if (res.status === 404) throw new NotFound(path);
    if (!res.ok) throw new UpstreamError(`${path} -> ${res.status}`);
    return res.json() as Promise<T>;
  }

  list(limit: number) {
    return this.getJson<PokemonSummary[]>(`/pokemon?limit=${limit}`);
  }

  // details is a superset of Pokemon so 1 endpoint covers both
  get(nameOrId: string): Promise<Pokemon> {
    return this.details(nameOrId);
  }

  details(name: string) {
    return this.getJson<PokemonDetails>(`/pokemon/${encodeURIComponent(name)}`);
  }

  move(name: string) {
    return this.getJson<Move>(`/moves/${encodeURIComponent(name)}`);
  }
}
