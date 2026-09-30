import { describe, expect, it } from "vitest";
import { CODES, testApp } from "@/test/fakes";
import { AccessDenied, InvalidAccessCode, TooManyAttempts } from "./errors";
import { SESSION_TTL_MS } from "./use-cases/sessions";

describe("sessions", () => {
  it("turns a good code into a role + a token that resolves back", async () => {
    const { app } = testApp();
    const { token, session } = await app.openSession(CODES.recruiter, "ip-1");
    expect(session.role).toBe("recruiter");
    expect(await app.resolveSession(token)).toMatchObject({ role: "recruiter", stale: false });
  });

  it("rejects a wrong code + writes it down", async () => {
    const { app, audit } = testApp();
    await expect(app.openSession("nope", "ip-1")).rejects.toBeInstanceOf(InvalidAccessCode);
    expect(audit.recent(1)[0]).toMatchObject({ action: "session:open", allowed: false });
  });

  it("blocks the 6th try in a minute, even with the right code", async () => {
    const { app } = testApp();
    for (let i = 0; i < 5; i++) await app.openSession("wrong", "ip-1").catch(() => {});
    await expect(app.openSession(CODES.admin, "ip-1")).rejects.toBeInstanceOf(TooManyAttempts);
    // another client isn't punished for it
    await expect(app.openSession(CODES.admin, "ip-2")).resolves.toBeTruthy();
  });

  it("treats an expired token as a visitor + flags it", async () => {
    const { app, tick } = testApp();
    const { token } = await app.openSession(CODES.admin, "ip-1");
    tick(SESSION_TTL_MS + 1);
    expect(await app.resolveSession(token)).toEqual({ role: "visitor", expiresAt: null, stale: true });
  });

  it("no token = plain visitor", async () => {
    const { app } = testApp();
    expect(await app.resolveSession(null)).toMatchObject({ role: "visitor", stale: false });
  });
});

describe("guarded use cases", () => {
  it("hides my phone from visitors + logs the attempt", () => {
    const { app, audit } = testApp();
    expect(() => app.revealContact("visitor")).toThrow(AccessDenied);
    expect(audit.recent(1)[0]).toMatchObject({ role: "visitor", action: "contact:read", allowed: false });
  });

  it("shows it to recruiters", () => {
    const { app } = testApp();
    expect(app.revealContact("recruiter")).toMatchObject({ phone: "+33 0 00 00 00 00", whatsapp: null });
  });

  it("keeps the audit log for admins only", () => {
    const { app } = testApp();
    expect(() => app.readAudit("recruiter")).toThrow(AccessDenied);
    expect(Array.isArray(app.readAudit("admin"))).toBe(true);
  });

  it("clamps the pokedex limit to gen 1", async () => {
    const { app, catalog } = testApp();
    await app.listPokemon("visitor", 9999);
    await app.listPokemon("visitor", -4);
    expect(catalog.calls).toEqual(["list:151", "list:1"]);
  });
});
