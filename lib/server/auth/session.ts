import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Session tokens: a random id, stored server-side, handed out inside an
 * HMAC-signed cookie value as `<id>.<signature>`.
 *
 * The signature is not what authenticates the session — the stored record is,
 * and it is what revocation deletes. The signature is there so a request
 * carrying a guessed or tampered id is rejected on arithmetic alone, before it
 * costs a database round trip. That turns "hammer the endpoint to enumerate
 * session ids" into an offline attack on a 256-bit HMAC, and keeps a flood of
 * junk cookies from becoming a flood of queries.
 */

const SESSION_COOKIE = "lunowix_session";
const TOKEN_BYTES = 32;

/** Thirty days, matching what "Remember me" implies to someone ticking it. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Without it, a session that should not outlive the browsing session. */
export const SHORT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export { SESSION_COOKIE };

/**
 * The signing key.
 *
 * Absent in production this THROWS rather than inventing one. A per-process
 * random fallback would sign cookies that the next deploy — or the next
 * instance behind the load balancer — could not verify, silently signing
 * everyone out at intervals nobody could explain. A hardcoded fallback would be
 * worse: a public constant that mints valid sessions for every deployment that
 * forgot to set the variable.
 *
 * In development a fixed, obviously-not-secret key is used so sessions survive
 * a dev-server restart.
 */
function secret(): Buffer {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return Buffer.from(configured, "utf8");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Generate one with " +
        "`openssl rand -base64 32` and set it in the environment. Sessions " +
        "cannot be signed safely without it.",
    );
  }
  if (configured) {
    console.warn("[lunowix] AUTH_SECRET is under 32 characters — using the dev key instead.");
  }
  return Buffer.from("lunowix-development-only-signing-key", "utf8");
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

export interface IssuedToken {
  /** Stored as the session record's id. Never sent as-is. */
  id: string;
  /** Goes in the cookie. */
  value: string;
  expiresAt: number;
}

export function issueToken(remember: boolean): IssuedToken {
  const id = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    id,
    value: `${id}.${sign(id)}`,
    expiresAt: Date.now() + (remember ? SESSION_TTL_MS : SHORT_SESSION_TTL_MS),
  };
}

/** The session id inside a cookie value, or null if the signature does not hold. */
export function readToken(value: string | undefined): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const id = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), "base64url");
  const expected = Buffer.from(sign(id), "base64url");

  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? id : null;
}

/**
 * Cookie attributes.
 *
 * `httpOnly` keeps the token out of reach of any script on the page, which is
 * what stops an XSS from becoming a stolen session. `sameSite: "lax"` is the
 * CSRF control for this app: it means the cookie is not attached to a
 * cross-site POST, so a form on someone else's page cannot act as the signed-in
 * visitor, while an ordinary top-level link into the site still arrives
 * authenticated. `secure` is off on localhost only, because a dev server speaks
 * http and the browser would otherwise discard the cookie.
 */
export function cookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  };
}

/** The attributes that clear it. `maxAge: 0` rather than a past date, for proxies that rewrite dates. */
export function clearedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
