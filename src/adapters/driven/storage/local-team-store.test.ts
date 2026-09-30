import { describe, expect, it } from "vitest";
import { member } from "@/test/fixtures";
import { LocalTeamStore } from "./local-team-store";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    storage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    } as Storage,
  };
}

describe("LocalTeamStore", () => {
  it("saves + loads a team", () => {
    const { storage } = memoryStorage();
    const store = new LocalTeamStore(() => storage);
    const team = [member("pikachu", ["electric"])];
    store.save(team);
    expect(store.load()).toEqual(team);
  });

  it("ignores junk or an old format instead of crashing", () => {
    const { storage } = memoryStorage();
    const store = new LocalTeamStore(() => storage);
    storage.setItem("hire-me.team.v2", "{not json");
    expect(store.load()).toEqual([]);
    storage.setItem("hire-me.team.v2", JSON.stringify([{ name: "old", moves: ["tackle"] }]));
    expect(store.load()).toEqual([]);
  });

  it("clears only its own key", () => {
    const { storage, data } = memoryStorage();
    storage.setItem("someone-else", "keep me");
    const store = new LocalTeamStore(() => storage);
    store.save([member("a", ["normal"])]);
    store.clear();
    expect([...data.keys()]).toEqual(["someone-else"]);
  });

  it("works on the server where there's no storage", () => {
    const store = new LocalTeamStore(() => undefined);
    expect(store.load()).toEqual([]);
    expect(() => store.save([])).not.toThrow();
  });
});
