import type { Metadata } from "next";
import { Arena } from "@/ui/battle/arena";

export const metadata: Metadata = { title: "Battle" };

export default function ArenaPage() {
  return <Arena />;
}
