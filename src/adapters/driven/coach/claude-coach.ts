import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import type { CoachModel } from "@/core/application/use-cases/coach-team";
import { TYPE_CHART } from "@/core/domain/battle/type-chart";
import { ALL_TYPES, type Diagnosis, type TeamTelemetry } from "@/core/domain/coach/coach";

export const DiagnosisSchema = z.object({
  verdict: z.enum(["ready", "risky", "weak"]),
  summary: z.string().max(300),
  threats: z.array(z.object({ type: z.enum(ALL_TYPES as [string, ...string[]]), why: z.string() })).max(5),
  fixes: z.array(z.string()).min(1).max(5),
  mvp: z.string().nullable(),
});

// stable prefix: instructions + the type chart as "technical docs". same bytes every call = cacheable
const SYSTEM = `You coach Pokémon gen 1 players. You get hard numbers about a team (telemetry) and sometimes its last battle.
Base every claim on those numbers + the type chart below. Don't invent pokemon the player doesn't have.
threats: attack types that hit 2+ of their pokemon super effectively (or 1 if the team is tiny).
fixes: concrete, short, doable in the team builder (add a type, swap a pokemon, fill the team).
verdict: "weak" if the team is tiny or has 3+ big threats, "risky" if it has 1-2, "ready" otherwise.
mvp: the pokemon that did the most damage in the battle, or the strongest on paper if there was no battle.

Type chart (attacker -> defender -> multiplier, missing = 1x):
${JSON.stringify(TYPE_CHART)}`;

export class ClaudeCoach implements CoachModel {
  readonly name: string;

  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
    private readonly opts: { serverFallback?: boolean; timeoutMs?: number } = {},
  ) {
    this.name = model;
  }

  async diagnose(telemetry: TeamTelemetry, onDelta: (text: string) => void): Promise<Diagnosis> {
    const stream = this.client.beta.messages.stream(
      {
        model: this.model,
        max_tokens: 16000,
        // coaching is closer to chat than to hard reasoning, low effort keeps it quick + cheap
        output_config: { effort: "low", format: zodOutputFormat(DiagnosisSchema) },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Team telemetry:\n${JSON.stringify(telemetry)}` }],
        // if a safety classifier declines, the API retries on another model by itself
        ...(this.opts.serverFallback
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { timeout: this.opts.timeoutMs ?? 45_000, maxRetries: 1 },
    );

    stream.on("text", onDelta);
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") throw new Error("model declined");
    if (message.stop_reason === "max_tokens") throw new Error("answer got cut off");

    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    // parse + validate ourselves. a model answer is untrusted input like any other
    return DiagnosisSchema.parse(JSON.parse(text));
  }
}
