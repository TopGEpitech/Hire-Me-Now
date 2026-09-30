import { describe, expect, it } from "vitest";
import { EnvAccessCodes } from "./env-access-codes";
import { HmacTokenService } from "./hmac-token-service";
import { MemoryRateLimiter } from "./memory-rate-limiter";

describe("HmacTokenService", () => {
  const tokens = new HmacTokenService("a".repeat(32));
  const session = { role: "recruiter" as const, expiresAt: 123 };

  it("round trips", async () => {
    expect(await tokens.verify(await tokens.sign(session))).toEqual(session);
  });

  it("rejects a payload someone edited to become admin", async () => {
    const [, sig] = (await tokens.sign(session)).split(".");
    const forged = Buffer.from(JSON.stringify({ role: "admin", exp: 123 })).toString("base64url");
    expect(await tokens.verify(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const other = new HmacTokenService("b".repeat(32));
    expect(await tokens.verify(await other.sign(session))).toBeNull();
  });

  it("rejects garbage", async () => {
    for (const junk of ["", "abc", "a.b.c", "....", "%%%.%%%"]) {
      expect(await tokens.verify(junk)).toBeNull();
    }
  });

  it("refuses a short secret", () => {
    expect(() => new HmacTokenService("short")).toThrow(/32/);
  });
});

describe("EnvAccessCodes", () => {
  it("maps codes to roles", () => {
    const codes = new EnvAccessCodes({ recruiter: "rec-code-1", admin: "admin-code-12" });
    expect(codes.roleFor("rec-code-1")).toBe("recruiter");
    expect(codes.roleFor("admin-code-12")).toBe("admin");
    expect(codes.roleFor("rec-code-")).toBeNull();
  });

  it("makes a role unreachable when its code isn't set", () => {
    const codes = new EnvAccessCodes({ recruiter: "rec-code-1", admin: undefined });
    expect(codes.roleFor("")).toBeNull();
    expect(codes.roleFor("undefined")).toBeNull();
  });
});

describe("MemoryRateLimiter", () => {
  it("lets N through, blocks the next, opens again after the window", () => {
    let now = 0;
    const limiter = new MemoryRateLimiter(2, 1000, () => now);

    expect(limiter.hit("k").allowed).toBe(true);
    expect(limiter.hit("k").allowed).toBe(true);
    expect(limiter.hit("k")).toEqual({ allowed: false, retryAfterMs: 1000 });

    now = 1000;
    expect(limiter.hit("k").allowed).toBe(true);
  });
});
