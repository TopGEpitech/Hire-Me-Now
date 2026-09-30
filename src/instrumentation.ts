// next.js calls this once at boot. traces go to whatever OTLP endpoint is in env
// (OTEL_EXPORTER_OTLP_ENDPOINT -> an otel collector -> Grafana Tempo, Datadog, Honeycomb...)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "hire-me" });
}
