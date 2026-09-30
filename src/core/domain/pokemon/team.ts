import { MAX_TEAM_SIZE, type TeamMember } from "./pokemon";

export class TeamRuleBroken extends Error {}

export function addToTeam(team: TeamMember[], member: TeamMember): TeamMember[] {
  if (team.length >= MAX_TEAM_SIZE) throw new TeamRuleBroken(`team is full (${MAX_TEAM_SIZE} max)`);
  if (team.some((m) => m.id === member.id)) throw new TeamRuleBroken(`${member.name} is already in`);
  return [...team, member];
}

export const removeFromTeam = (team: TeamMember[], id: number) => team.filter((m) => m.id !== id);
