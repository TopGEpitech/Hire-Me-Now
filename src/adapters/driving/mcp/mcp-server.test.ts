import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { testApp } from "@/test/fakes";
import { createMcpServer } from "./mcp-server";

async function connect() {
  const { app, catalog } = testApp();
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createMcpServer(app, catalog).connect(a);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(b);
  return client;
}

const call = async (client: Client, name: string, args: Record<string, unknown>) => {
  const res = await client.callTool({ name, arguments: args });
  return JSON.parse((res.content as Array<{ text: string }>)[0].text);
};

describe("mcp server", () => {
  it("lists its tools with read-only hints", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "coach_team",
      "get_pokemon",
      "plan_gym_tour",
      "search_pokemon",
      "simulate_battle",
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });

  it("searches + plans a tour", async () => {
    const client = await connect();
    expect(await call(client, "search_pokemon", { query: "25" })).toContainEqual({
      id: 25,
      name: "mon-25",
      sprite: "/25.png",
    });
    expect((await call(client, "plan_gym_tour", { from: "cinnabar" })).order[0].id).toBe("cinnabar");
  });

  it("simulates the same battle twice with the same seed", async () => {
    const client = await connect();
    const args = { team: ["mon-1", "mon-2"], rival: ["mon-3"], seed: 42 };
    const first = await call(client, "simulate_battle", args);
    expect(["team", "rival"]).toContain(first.winner);
    expect(await call(client, "simulate_battle", args)).toEqual(first);
  });

  it("coaches a team", async () => {
    const out = await call(await connect(), "coach_team", { team: ["mon-1"] });
    expect(out).toMatchObject({ kind: "diagnosis", model: "rules", diagnosis: { verdict: "weak" } });
  });

  it("validates input", async () => {
    const res = await (await connect()).callTool({ name: "get_pokemon", arguments: { name: "../etc/passwd" } });
    expect(res.isError).toBe(true);
  });
});
