import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { HmacTokenService } from "./hmac-token-service";
import { CompositeTokenService, OidcTokenVerifier } from "./oidc-token-verifier";

const issuer = "https://sso.test/realms/hireme";
const audience = "hire-me-web";

let verifier: OidcTokenVerifier;
let privateKey: CryptoKey;

// a fake keycloak realm: our own key pair + a local JWKS
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
  verifier = new OidcTokenVerifier({ issuer, audience, jwks: createLocalJWKSet({ keys: [jwk] }) });
});

const token = (claims: Record<string, unknown>, opts: { iss?: string; aud?: string; exp?: string } = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? issuer)
    .setAudience(opts.aud ?? audience)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "5m")
    .sign(privateKey);

describe("OidcTokenVerifier (keycloak)", () => {
  it("maps realm roles to our roles", async () => {
    const t = await token({ realm_access: { roles: ["offline_access", "hireme-recruiter"] } });
    expect(await verifier.verify(t)).toMatchObject({ role: "recruiter" });
  });

  it("picks the highest role when there are several", async () => {
    const t = await token({ realm_access: { roles: ["hireme-recruiter", "hireme-admin"] } });
    expect((await verifier.verify(t))?.role).toBe("admin");
  });

  it("says no to: no role, wrong issuer, wrong audience, expired", async () => {
    expect(await verifier.verify(await token({ realm_access: { roles: ["something"] } }))).toBeNull();
    const roles = { realm_access: { roles: ["hireme-admin"] } };
    expect(await verifier.verify(await token(roles, { iss: "https://evil.test" }))).toBeNull();
    expect(await verifier.verify(await token(roles, { aud: "other-app" }))).toBeNull();
    expect(await verifier.verify(await token(roles, { exp: "-1m" }))).toBeNull();
  });

  it("rejects the HS256-with-public-key trick", async () => {
    const forged = await new SignJWT({ realm_access: { roles: ["hireme-admin"] } })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("x".repeat(32)));
    expect(await verifier.verify(forged)).toBeNull();
  });

  it("works next to our own sessions in the composite", async () => {
    const hmac = new HmacTokenService("s".repeat(32));
    const both = new CompositeTokenService(hmac, [verifier]);
    const ours = await both.sign({ role: "recruiter", expiresAt: 1 });
    expect((await both.verify(ours))?.role).toBe("recruiter");
    const keycloak = await token({ realm_access: { roles: ["hireme-admin"] } });
    expect((await both.verify(keycloak))?.role).toBe("admin");
  });
});
