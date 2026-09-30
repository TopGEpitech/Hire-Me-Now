import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { App } from "@/core/application/app";
import type { CoachEvent } from "@/core/application/use-cases/coach-team";
import { recruitPokemon } from "@/core/application/use-cases/recruit-pokemon";
import type { PokemonCatalog } from "@/core/application/ports";
import { activeFighter, chooseAiMove, playTurn, startBattle } from "@/core/domain/battle/engine";
import { seeded } from "@/core/domain/battle/seeded";
import { GEN_ONE_COUNT, MAX_TEAM_SIZE, matchesSearch } from "@/core/domain/pokemon/pokemon";
import { KANTO } from "@/core/domain/routing/route";

// Another driving adapter. Claude Desktop, Claude Code or Cursor talk to the same use cases
// as the website, just over MCP instead of http. MCP callers are treated as visitors (least privilege)

const ROLE = "visitor" as const;
const Names = z
  .array(z.string().regex(/^[a-z0-9-]{1,40}$/i))
  .min(1)
  .max(MAX_TEAM_SIZE);
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function createMcpServer(app: App, catalog: PokemonCatalog) {
  const server = new McpServer({ name: "hire-me-pokedex", version: "1.0.0" });

  server.registerTool(
    "search_pokemon",
    {
      description: "Search gen 1 pokemon by name or number. Returns id, name, sprite url.",
      inputSchema: { query: z.string().max(40) },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) =>
      json((await app.listPokemon(ROLE, GEN_ONE_COUNT)).filter((p) => matchesSearch(p, query)).slice(0, 20)),
  );

  server.registerTool(
    "get_pokemon",
    {
      description: "Full pokedex entry: types, base stats, abilities, description, evolution line.",
      inputSchema: { name: z.string().regex(/^[a-z0-9-]{1,40}$/i) },
      annotations: { readOnlyHint: true },
    },
    async ({ name }) => {
      const { moveNames, ...rest } = await app.pokemonDetails(ROLE, name.toLowerCase());
      return json({ ...rest, learnableMoves: moveNames.length });
    },
  );

  server.registerTool(
    "plan_gym_tour",
    {
      description: "Shortest round trip through the 8 Kanto gyms from a town (nearest neighbour + 2-opt).",
      inputSchema: { from: z.enum(KANTO.map((k) => k.id) as [string, ...string[]]).default("pallet") },
      annotations: { readOnlyHint: true },
    },
    async ({ from }) => json(app.planGymTour(from)),
  );

  server.registerTool(
    "simulate_battle",
    {
      description:
        "Simulate a full battle, your team vs a rival team, both play their best move each turn. Same seed = same result.",
      inputSchema: { team: Names, rival: Names, seed: z.number().int().default(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ team, rival, seed }) => {
      const random = seeded(seed);
      const recruit = recruitPokemon({ catalog, random });
      let battle = startBattle(await Promise.all(team.map(recruit)), await Promise.all(rival.map(recruit)));
      for (let turn = 0; turn < 500 && !battle.winner; turn++) {
        const me = activeFighter(battle.player)!;
        battle = playTurn(
          battle,
          chooseAiMove(me, activeFighter(battle.ai)!, () => 0.99),
          random,
        );
      }
      return json({
        winner: battle.winner === "player" ? "team" : battle.winner === "ai" ? "rival" : "draw",
        turns: battle.turn,
        left: {
          team: battle.player.filter((f) => f.hp > 0).map((f) => f.name),
          rival: battle.ai.filter((f) => f.hp > 0).map((f) => f.name),
        },
        log: battle.log.slice(-15),
      });
    },
  );

  server.registerTool(
    "coach_team",
    {
      description: "Ask the AI coach about a team. Returns a structured diagnosis: verdict, threats, fixes, mvp.",
      inputSchema: { team: Names },
      annotations: { readOnlyHint: true },
    },
    async ({ team }) => {
      const members = await Promise.all(team.map(recruitPokemon({ catalog, random: seeded(7) })));
      let result: CoachEvent | undefined;
      await app.coachTeam(ROLE, members, [], (e) => {
        if (e.kind === "diagnosis") result = e;
      });
      return json(result);
    },
  );

  return server;
}
