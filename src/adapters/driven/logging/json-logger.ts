import type { Clock, Logger } from "@/core/application/ports";

type Level = "info" | "warn" | "error";

// 1 json object per line. Cloud Run, Vercel, Datadog, Loki... they all read this without config
export class JsonLogger implements Logger {
  constructor(
    private readonly write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
    private readonly clock: Clock = Date.now,
    private readonly base: Record<string, unknown> = {},
  ) {}

  private log(level: Level, event: string, fields: Record<string, unknown> = {}) {
    const err = fields.error instanceof Error ? { error: fields.error.message, stack: fields.error.stack } : {};
    this.write(
      JSON.stringify({ time: new Date(this.clock()).toISOString(), level, event, ...this.base, ...fields, ...err }),
    );
  }

  info(event: string, fields?: Record<string, unknown>) {
    this.log("info", event, fields);
  }

  warn(event: string, fields?: Record<string, unknown>) {
    this.log("warn", event, fields);
  }

  error(event: string, fields?: Record<string, unknown>) {
    this.log("error", event, fields);
  }
}
