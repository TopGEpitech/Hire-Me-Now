import { describe, expect, it } from "vitest";
import type { DomainEvent } from "@/core/application/ports";
import { FanoutPublisher, SignedWebhookPublisher, SlackPublisher } from "./publishers";
import { signPayload, verifySignature } from "./signing";

const event: DomainEvent = { type: "hire.clicked", at: 0, role: "recruiter" };

function recorder(status = 200) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(null, { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

describe("webhook signatures", () => {
  const secret = "whsec_test";
  const body = '{"a":1}';

  it("accepts a fresh, correct signature", () => {
    expect(verifySignature(secret, signPayload(secret, body, 1000), body, 1010)).toBe(true);
  });

  it("rejects a changed body, a wrong secret or a replay", () => {
    const header = signPayload(secret, body, 1000);
    expect(verifySignature(secret, header, '{"a":2}', 1000)).toBe(false);
    expect(verifySignature("other", header, body, 1000)).toBe(false);
    expect(verifySignature(secret, header, body, 1000 + 301)).toBe(false);
  });

  it("rejects junk headers", () => {
    for (const h of [null, "", "t=abc,v1=00", "v1=deadbeef", "t=1000"]) {
      expect(verifySignature(secret, h, body, 1000)).toBe(false);
    }
  });
});

describe("publishers", () => {
  it("sends a signed webhook the receiver can verify", async () => {
    const { calls, fetcher } = recorder();
    await new SignedWebhookPublisher(
      "https://example.com/hook",
      "s3cret",
      fetcher,
      () => 5_000_000,
      () => "evt_1",
    ).publish(event);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-hireme-event"]).toBe("hire.clicked");
    expect(verifySignature("s3cret", headers["x-hireme-signature"], calls[0].init.body as string, 5000)).toBe(true);
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ id: "evt_1", type: "hire.clicked" });
  });

  it("posts a readable message to slack", async () => {
    const { calls, fetcher } = recorder();
    await new SlackPublisher("https://hooks.slack.com/x", fetcher).publish(event);
    expect(JSON.parse(calls[0].init.body as string).text).toContain("HIRE");
  });

  it("fans out: 1 broken target doesn't stop the others + gets logged", async () => {
    const ok = recorder();
    const broken = recorder(500);
    const warnings: unknown[] = [];
    const logger = { info() {}, error() {}, warn: (e: string, f?: unknown) => void warnings.push({ e, f }) };
    await new FanoutPublisher(
      [
        { name: "slack", publisher: new SlackPublisher("https://a", broken.fetcher) },
        { name: "webhook", publisher: new SignedWebhookPublisher("https://b", "s", ok.fetcher) },
      ],
      logger,
    ).publish(event);
    expect(ok.calls).toHaveLength(1);
    expect(warnings).toHaveLength(1);
  });
});
