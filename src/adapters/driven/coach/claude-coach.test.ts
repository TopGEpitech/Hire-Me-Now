import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { teamTelemetry } from "@/core/domain/coach/coach";
import { member } from "@/test/fixtures";
import { ClaudeCoach } from "./claude-coach";

// fake the network, not the SDK: the real client parses a real SSE stream
function sse(chunks: string[], stopReason = "end_turn") {
  const ev = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const body = [
    ev("message_start", {
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "m",
        content: [],
        stop_reason: null,
        usage: { input_tokens: 1, output_tokens: 0 },
      },
    }),
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ...chunks.map((text) => ev("content_block_delta", { index: 0, delta: { type: "text_delta", text } })),
    ev("content_block_stop", { index: 0 }),
    ev("message_delta", { delta: { stop_reason: stopReason }, usage: { output_tokens: 10 } }),
    ev("message_stop", {}),
  ].join("");
  const bodies: unknown[] = [];
  const fetch = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    return new Response(body, { headers: { "content-type": "text/event-stream" } });
  }) as unknown as typeof globalThis.fetch;
  return { client: new Anthropic({ apiKey: "test", fetch, maxRetries: 0 }), bodies };
}

const telemetry = teamTelemetry([member("charmander", ["fire"])]);
const answer = JSON.stringify({
  verdict: "weak",
  summary: "tiny team",
  threats: [{ type: "water", why: "1 of 1" }],
  fixes: ["add 5"],
  mvp: "charmander",
});

describe("ClaudeCoach", () => {
  it("streams text + returns a validated diagnosis", async () => {
    const { client, bodies } = sse([answer.slice(0, 20), answer.slice(20)]);
    const deltas: string[] = [];
    const d = await new ClaudeCoach(client, "claude-opus-5-5", { serverFallback: true }).diagnose(telemetry, (t) =>
      deltas.push(t),
    );

    expect(d.verdict).toBe("weak");
    expect(deltas.join("")).toBe(answer);
    const sent = bodies[0] as Record<string, unknown>;
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.fallbacks).toBe("default");
    expect(sent.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
  });

  it("throws on a refusal so the next model can take over", async () => {
    const { client } = sse([""], "refusal");
    await expect(new ClaudeCoach(client, "m").diagnose(telemetry, () => {})).rejects.toThrow();
  });

  it("throws on output that doesn't match the schema", async () => {
    const { client } = sse([JSON.stringify({ verdict: "amazing", summary: 1 })]);
    await expect(new ClaudeCoach(client, "m").diagnose(telemetry, () => {})).rejects.toThrow();
  });

  it("rejects a threat type that doesn't exist", async () => {
    const { client } = sse([answer.replace('"water"', '"sound"')]);
    await expect(new ClaudeCoach(client, "m").diagnose(telemetry, () => {})).rejects.toThrow();
  });
});
