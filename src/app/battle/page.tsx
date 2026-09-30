import type { Metadata } from "next";
import { TeamBuilder } from "@/ui/battle/team-builder";

export const metadata: Metadata = { title: "Build your team" };

export default function BattlePage() {
  return <TeamBuilder />;
}
