import { createHmac, timingSafeEqual } from "node:crypto";

// same scheme as stripe: "t=<unix seconds>,v1=<hex hmac of `${t}.${body}`>".
// the timestamp is inside the signature, so an old captured request can't be replayed later

export function signPayload(secret: string, body: string, unixSeconds: number) {
  const mac = createHmac("sha256", secret).update(`${unixSeconds}.${body}`).digest("hex");
  return `t=${unixSeconds},v1=${mac}`;
}

export function verifySignature(
  secret: string,
  header: string | null,
  body: string,
  nowSeconds: number,
  toleranceSeconds = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  if (Math.abs(nowSeconds - t) > toleranceSeconds) return false;

  const expected = Buffer.from(signPayload(secret, body, t).split("v1=")[1], "hex");
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
