import { randomBytes } from "node:crypto";
import type { Session, TokenService } from "@/core/application/ports";
import { isRole } from "@/core/domain/access/rbac";

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array | string) => Buffer.from(bytes).toString("base64url");

// basically a JWT with HS256, minus the header.
// only 1 algorithm exists here so there's no "alg: none" trick to play on us
export class HmacTokenService implements TokenService {
  private readonly key: Promise<CryptoKey>;

  constructor(secret: string) {
    if (secret.length < 32) throw new Error("AUTH_SECRET needs 32+ chars");
    this.key = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
  }

  // no secret configured? still works, but sessions die on every restart. fine for local dev
  static withRandomSecret() {
    return new HmacTokenService(randomBytes(48).toString("base64url"));
  }

  async sign(session: Session) {
    const payload = b64url(JSON.stringify({ role: session.role, exp: session.expiresAt }));
    const sig = await crypto.subtle.sign("HMAC", await this.key, enc.encode(payload));
    return `${payload}.${b64url(new Uint8Array(sig))}`;
  }

  async verify(token: string): Promise<Session | null> {
    const [payload, sig, extra] = token.split(".");
    if (!payload || !sig || extra !== undefined) return null;

    // subtle.verify compares in constant time, no need to roll my own
    const ok = await crypto.subtle
      .verify("HMAC", await this.key, Buffer.from(sig, "base64url"), enc.encode(payload))
      .catch(() => false);
    if (!ok) return null;

    try {
      const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (typeof data !== "object" || data === null) return null;
      const { role, exp } = data as Record<string, unknown>;
      if (!isRole(role) || typeof exp !== "number") return null;
      return { role, expiresAt: exp };
    } catch {
      return null;
    }
  }
}
