import type { Clock, DomainEvent, EventPublisher, Logger } from "@/core/application/ports";
import { signPayload } from "./signing";

const TIMEOUT_MS = 3000;

// outbound webhook, signed. the receiver checks the header with verifySignature()
export class SignedWebhookPublisher implements EventPublisher {
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly clock: Clock = Date.now,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async publish(event: DomainEvent) {
    const body = JSON.stringify({ id: this.newId(), ...event });
    const res = await this.fetcher(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hireme-event": event.type,
        "x-hireme-signature": signPayload(this.secret, body, Math.floor(this.clock() / 1000)),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`webhook answered ${res.status}`);
  }
}

const SLACK_TEXT: Record<DomainEvent["type"], (e: DomainEvent) => string> = {
  "hire.clicked": (e) => `:tada: someone clicked HIRE on the site (as ${e.role})`,
  "session.opened": (e) => `:key: a ${e.role} just logged in with an access code`,
};

// slack incoming webhook. the url itself is the secret, so it only lives in env
export class SlackPublisher implements EventPublisher {
  constructor(
    private readonly webhookUrl: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async publish(event: DomainEvent) {
    const res = await this.fetcher(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: SLACK_TEXT[event.type](event) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`slack answered ${res.status}`);
  }
}

// sends to every target, 1 failing never stops the others. failures are logged, never thrown
export class FanoutPublisher implements EventPublisher {
  constructor(
    private readonly targets: Array<{ name: string; publisher: EventPublisher }>,
    private readonly logger: Logger,
  ) {}

  async publish(event: DomainEvent) {
    const results = await Promise.allSettled(this.targets.map((t) => t.publisher.publish(event)));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        this.logger.warn("event_delivery_failed", { target: this.targets[i].name, event: event.type, error: r.reason });
      }
    });
  }
}
