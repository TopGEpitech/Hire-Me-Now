import { z } from "zod";

// 1 schema for a team member, used by localStorage + the coach endpoint. never trust the client
export const MemberSchema = z.object({
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
