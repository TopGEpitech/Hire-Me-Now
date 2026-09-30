import type { Permission, Role } from "../domain/access/rbac";

// the http adapter maps these to status codes. the core doesn't know what a 403 is

export class AccessDenied extends Error {
  constructor(
    readonly permission: Permission,
    readonly role: Role,
  ) {
    super(`${role} can't do ${permission}`);
  }
}

export class InvalidAccessCode extends Error {
  constructor() {
    super("wrong access code");
  }
}

export class TooManyAttempts extends Error {
  constructor(readonly retryAfterMs: number) {
    super("too many attempts, slow down");
  }
}

export class NotFound extends Error {}

export class UpstreamError extends Error {}
