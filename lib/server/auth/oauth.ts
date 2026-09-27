import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sign-in with Google, GitHub or Facebook.
 *
 * One registry, three entries. A provider is CONFIGURED only when both its
 * client id and secret are present in the environment, and nothing in the app
 * assumes any particular one exists: `/api/auth/providers` reports what is live
 * and the sign-in form enables exactly those buttons. Adding a fourth provider
 * is a row in `PROVIDERS`; enabling one later is two environment variables and a
 * redeploy, with no code change at all.
 *
 * On Facebook specifically: the code here is complete, but Meta gates the `email`
 * permission behind Business Verification and App Review. Until that is done the
 * button works for accounts listed as testers on the Meta app and for nobody
 * else. That is Meta's process, not a gap here — see SETUP.md.
 */

export type ProviderId = "google" | "github" | "facebook";

/** What a provider tells us about the person, normalised. */
export interface OAuthProfile {
  /** The provider's own stable id for this account. Never an email. */
  providerAccountId: string;
  email: string | null;
  /**
   * Whether the PROVIDER asserts it has verified that email.
   *
   * This is the single most important field here. Linking an incoming provider
   * identity to an existing password account on an unverified email is an
   * account-takeover route: anyone can create an account at a provider claiming
   * someone else's address. See `linkOrCreate` in `repo/identities.ts`.
   */
  emailVerified: boolean;
  name: string | null;
}

interface ProviderConfig {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** Not every provider implements PKCE; sending it to one that does not can fail. */
  supportsPkce: boolean;
  /** Turns the provider's own payload into an `OAuthProfile`. */
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

const env = (name: string) => process.env[name]?.trim() || "";

/* -------------------------------------------------------------------------- */
/* Profile fetchers                                                            */
/* -------------------------------------------------------------------------- */

async function getJson(url: string, token: string, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      // GitHub returns 403 to requests with no user agent.
      "user-agent": "lunowix",
      ...extraHeaders,
    },
    // Never cache a response tied to a specific access token.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

async function googleProfile(token: string): Promise<OAuthProfile> {
  const me = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token);
  return {
    providerAccountId: String(me.sub),
    email: typeof me.email === "string" ? me.email : null,
    // Google returns this as a real boolean on the OIDC endpoint.
    emailVerified: me.email_verified === true,
    name: typeof me.name === "string" ? me.name : null,
  };
}

async function githubProfile(token: string): Promise<OAuthProfile> {
  const me = await getJson("https://api.github.com/user", token);

  /*
   * `/user` omits the email when the person has it set to private, and its
   * `email` field carries no verification status either way. `/user/emails`
   * carries both, so the primary verified address comes from there.
   */
  let email = typeof me.email === "string" ? me.email : null;
  let emailVerified = false;

  try {
    const emails = (await getJson("https://api.github.com/user/emails", token)) as unknown as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];

    const primary = Array.isArray(emails)
      ? emails.find((entry) => entry.primary && entry.verified) ??
        emails.find((entry) => entry.verified)
      : undefined;

    if (primary) {
      email = primary.email;
      emailVerified = true;
    }
  } catch {
    // The `user:email` scope may have been declined. Fall through with whatever
    // `/user` gave, marked unverified, and let the linking rule decide.
  }

  return {
    providerAccountId: String(me.id),
    email,
    emailVerified,
    name: (typeof me.name === "string" ? me.name : null) ?? (typeof me.login === "string" ? me.login : null),
  };
}

async function facebookProfile(token: string): Promise<OAuthProfile> {
  const me = await getJson(
    "https://graph.facebook.com/v21.0/me?fields=id,name,email",
    token,
  );

  /*
   * Facebook has no `email_verified` field. An address is only returned at all
   * when the person granted the `email` permission, and Meta does verify
   * addresses on its own accounts — so a returned address is treated as
   * verified. This is the weakest assertion of the three, which is worth knowing
   * when deciding whether to enable this provider at all.
   */
  const email = typeof me.email === "string" ? me.email : null;
  return {
    providerAccountId: String(me.id),
    email,
    emailVerified: Boolean(email),
    name: typeof me.name === "string" ? me.name : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    supportsPkce: true,
    fetchProfile: googleProfile,
  },
  github: {
    id: "github",
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    // `user:email` is what makes the verified primary address readable.
    scope: "read:user user:email",
    supportsPkce: true,
    fetchProfile: githubProfile,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email public_profile",
    supportsPkce: false,
    fetchProfile: facebookProfile,
  },
};

const ENV_PREFIX: Record<ProviderId, string> = {
  google: "GOOGLE",
  github: "GITHUB",
  facebook: "FACEBOOK",
};

function credentials(id: ProviderId) {
  const prefix = ENV_PREFIX[id];
  return {
    clientId: env(`${prefix}_CLIENT_ID`),
    clientSecret: env(`${prefix}_CLIENT_SECRET`),
  };
}

export function isProviderId(value: string): value is ProviderId {
  return value === "google" || value === "github" || value === "facebook";
}

/** A provider is usable only with BOTH halves of its credential present. */
export function isConfigured(id: ProviderId): boolean {
  const { clientId, clientSecret } = credentials(id);
  return Boolean(clientId && clientSecret);
}

/** For `/api/auth/providers`, so the form enables exactly what works. */
export function configuredProviders(): { id: ProviderId; label: string }[] {
  return (Object.keys(PROVIDERS) as ProviderId[])
    .filter(isConfigured)
    .map((id) => ({ id, label: PROVIDERS[id].label }));
}

/**
 * The redirect URI, which must match what is registered with the provider
 * EXACTLY — scheme, host, port and path, with no trailing slash.
 *
 * Built from `NEXT_PUBLIC_SITE_URL` rather than from the request, because the
 * request's own host can be set by whoever is calling: an attacker who could
 * steer this value could have the authorization code delivered to their own
 * server. A mismatch here is the single most common cause of
 * `redirect_uri_mismatch`, and the fix is always to make the two strings equal.
 */
export function redirectUri(id: ProviderId): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/api/auth/oauth/${id}/callback`;
}

export interface ProviderDiagnostic {
  id: ProviderId;
  label: string;
  configured: boolean;
  /** The exact string to register with the provider. */
  callback: string;
}

/**
 * Every provider, live or not, with the callback URL it needs registered.
 *
 * Deliberately different from `configuredProviders()`: that one answers "what
 * should the form offer", this one answers "why is my provider not working",
 * which means it has to include the ones that are switched off. Setting a provider
 * up is a chicken-and-egg problem otherwise — the callback URL has to be
 * registered with the provider BEFORE the credentials exist to enable it, so a
 * list that hides unconfigured providers cannot name the one string you need.
 *
 * The callback contains no secret. It is a fixed, public path on this site, it is
 * shown on the provider's own consent screen, and it is visible in the address bar
 * during any sign-in. Reporting it discloses nothing and removes the single most
 * common cause of a broken flow, `redirect_uri_mismatch`, which is almost always
 * `NEXT_PUBLIC_SITE_URL` disagreeing with what was registered.
 */
export function providerDiagnostics(): ProviderDiagnostic[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).map((id) => ({
    id,
    label: PROVIDERS[id].label,
    configured: isConfigured(id),
    callback: redirectUri(id),
  }));
}

/* -------------------------------------------------------------------------- */
/* State and PKCE                                                              */
/* -------------------------------------------------------------------------- */

function stateSecret(): Buffer {
  const configured = env("AUTH_SECRET");
  if (configured.length >= 32) return Buffer.from(configured, "utf8");
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required to sign the OAuth state parameter.");
  }
  return Buffer.from("lunowix-development-only-signing-key", "utf8");
}

/**
 * `state` is the CSRF control for the whole flow.
 *
 * It is signed, so a callback carrying a value this deployment did not mint is
 * rejected without touching the provider or the database. The verifier for PKCE
 * rides along inside it, which keeps the flow entirely stateless: no server-side
 * record of a pending sign-in to create, expire or clean up.
 */
export interface OAuthState {
  nonce: string;
  /** Where to send the person afterwards. Always a same-origin path. */
  next: string;
  verifier: string;
  issuedAt: number;
}

export function createState(next: string): { state: string; verifier: string } {
  const verifier = randomBytes(32).toString("base64url");
  const payload: OAuthState = {
    nonce: randomBytes(16).toString("base64url"),
    next,
    verifier,
    issuedAt: Date.now(),
  };

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return { state: `${body}.${signature}`, verifier };
}

/** Ten minutes: long enough to read a consent screen, short enough to matter. */
const STATE_TTL_MS = 10 * 60 * 1000;

export function readState(value: string | undefined): OAuthState | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), "base64url");
  const expected = Buffer.from(
    createHmac("sha256", stateSecret()).update(body).digest("base64url"),
    "base64url",
  );

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
    if (typeof parsed.issuedAt !== "number") return null;
    if (Date.now() - parsed.issuedAt > STATE_TTL_MS) return null;
    if (typeof parsed.verifier !== "string" || typeof parsed.nonce !== "string") return null;
    // Same rule as the login page: an absolute path on this origin, nothing else.
    if (typeof parsed.next !== "string" || !parsed.next.startsWith("/") || parsed.next.startsWith("//")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** S256 challenge for the verifier held in the state. */
async function challengeFor(verifier: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(verifier).digest("base64url");
}

/* -------------------------------------------------------------------------- */
/* The two halves of the flow                                                  */
/* -------------------------------------------------------------------------- */

/** Where to send the browser to begin. */
export async function authorizeUrl(
  id: ProviderId,
  state: string,
  verifier: string,
): Promise<string> {
  const provider = PROVIDERS[id];
  const { clientId } = credentials(id);

  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri(id));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("state", state);

  if (provider.supportsPkce) {
    url.searchParams.set("code_challenge", await challengeFor(verifier));
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

/** Exchanges the authorization code for an access token, then reads the profile. */
export async function exchangeCodeForProfile(
  id: ProviderId,
  code: string,
  verifier: string,
): Promise<OAuthProfile> {
  const provider = PROVIDERS[id];
  const { clientId, clientSecret } = credentials(id);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(id),
    grant_type: "authorization_code",
  });
  if (provider.supportsPkce) body.set("code_verifier", verifier);

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    // GitHub returns form-encoded unless asked for JSON.
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${id} token exchange responded ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (payload.error || !payload.access_token) {
    throw new Error(`${id} token exchange failed: ${payload.error ?? "no access_token"}`);
  }

  return provider.fetchProfile(payload.access_token);
}

export function providerLabel(id: ProviderId): string {
  return PROVIDERS[id].label;
}
