import { describe, expect, it } from "vitest";
import { JsonLogger } from "./json-logger";

describe("JsonLogger", () => {
  it("writes 1 json line per event with time + level", () => {
    const lines: string[] = [];
    const log = new JsonLogger(
      (l) => lines.push(l),
      () => 0,
      { service: "hire-me" },
    );
    log.info("http_request", { status: 200 });
    expect(JSON.parse(lines[0])).toEqual({
      time: "1970-01-01T00:00:00.000Z",
      level: "info",
      event: "http_request",
      service: "hire-me",
      status: 200,
    });
  });

  it("turns an Error into message + stack", () => {
    const lines: string[] = [];
    new JsonLogger((l) => lines.push(l)).error("boom", { error: new Error("nope") });
    const out = JSON.parse(lines[0]);
    expect(out.error).toBe("nope");
    expect(out.stack).toContain("Error: nope");
  });
});
