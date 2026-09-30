import { z } from "zod";
import type { TeamStore } from "@/core/application/ports";
import { MAX_TEAM_SIZE, type TeamMember } from "@/core/domain/pokemon/pokemon";

// v2 bcs the old shape had no stats + no move power. old saves just get ignored
const KEY = "hire-me.team.v2";

const MemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  sprite: z.string(),
  types: z.array(z.string()),
  stats: z.object({
    hp: z.number(),
    attack: z.number(),
    defense: z.number(),
    specialAttack: z.number(),
    specialDefense: z.number(),
    speed: z.number(),
  }),
  moves: z.array(z.object({ name: z.string(), type: z.string(), power: z.number().nullable() })).min(1),
});
const TeamSchema = z.array(MemberSchema).max(MAX_TEAM_SIZE);

export class LocalTeamStore implements TeamStore {
  constructor(private readonly storage: () => Storage | undefined = () => globalThis.localStorage) {}

  load(): TeamMember[] {
    try {
      const raw = this.storage()?.getItem(KEY);
      if (!raw) return [];
      const parsed = TeamSchema.safeParse(JSON.parse(raw));
      // someone edited localStorage by hand? fine, start clean
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  save(team: TeamMember[]) {
    this.storage()?.setItem(KEY, JSON.stringify(team));
  }

  // only our key. the old version called localStorage.clear() + nuked everything
  clear() {
    this.storage()?.removeItem(KEY);
  }
}
