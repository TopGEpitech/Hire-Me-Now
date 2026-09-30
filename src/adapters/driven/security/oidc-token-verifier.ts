import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Session, TokenService } from "@/core/application/ports";
import type { Role } from "@/core/domain/access/rbac";

// Keycloak (or any OIDC provider) behind the same TokenService port.
// the IdP issues tokens, we only verify them: signature from the realm's JWKS, issuer, audience, expiry.
// realm roles "hireme-admin" / "hireme-recruiter" map to our roles. anything else = visitor at best

const ROLE_ORDER: Array<Exclude<Role, "visitor">> = ["admin", "recruiter"];

export interface OidcConfig {
  issuer: string; // e.g. https://sso.example.com/realms/hireme
  audience: string; // the client id
  rolePrefix?: string;
  jwks?: JWTVerifyGetKey; // injectable for tests
}

export class OidcTokenVerifier implements TokenService {
  private readonly jwks: JWTVerifyGetKey;
  private readonly prefix: string;

  constructor(private readonly config: OidcConfig) {
    this.jwks = config.jwks ?? createRemoteJWKSet(new URL(`${config.issuer}/protocol/openid-connect/certs`));
    this.prefix = config.rolePrefix ?? "hireme-";
  }

  async sign(): Promise<string> {
    throw new Error("OIDC tokens come from the identity provider, we don't mint them");
  }

  async verify(token: string): Promise<Session | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        // only asymmetric algs. an HS256 token signed with the public key as secret is a classic trick
        algorithms: ["RS256", "ES256"],
      });
      const realmRoles = (payload.realm_access as { roles?: unknown } | undefined)?.roles;
      const roles = Array.isArray(realmRoles) ? realmRoles.filter((r): r is string => typeof r === "string") : [];
      const role = ROLE_ORDER.find((r) => roles.includes(`${this.prefix}${r}`));
      if (!role || typeof payload.exp !== "number") return null;
      return { role, expiresAt: payload.exp * 1000 };
    } catch {
      return null;
    }
  }
}

// our own HMAC sessions first, then any extra verifier (Keycloak). signing always uses the first one
export class CompositeTokenService implements TokenService {
  constructor(
    private readonly primary: TokenService,
    private readonly others: TokenService[],
  ) {}

  sign(session: Session) {
    return this.primary.sign(session);
  }

  async verify(token: string) {
    for (const service of [this.primary, ...this.others]) {
      const session = await service.verify(token);
      if (session) return session;
    }
    return null;
  }
}
