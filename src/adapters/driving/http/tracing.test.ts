import { trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { afterAll, describe, expect, it } from "vitest";
import { testApp } from "@/test/fakes";
import { createHttpApi } from "./http-api";

const exporter = new InMemorySpanExporter();
trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
afterAll(() => trace.disable());

describe("opentelemetry", () => {
  it("opens 1 span per request, tagged with status + request id, + puts the trace id in the log", async () => {
    const logs: Array<Record<string, unknown>> = [];
    const logger = { info: (_: string, f = {}) => void logs.push(f), warn() {}, error() {} };
    const http = createHttpApi(testApp().app, { secureCookies: false, logger, newId: () => "req-12345678" });

    await http.contact(new Request("http://x/api/contact"));

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe("GET /api/contact");
    expect(span.attributes["http.status_code"]).toBe(403);
    expect(span.attributes["hireme.request_id"]).toBe("req-12345678");
    expect(logs[0].traceId).toBe(span.spanContext().traceId);
  });
});
