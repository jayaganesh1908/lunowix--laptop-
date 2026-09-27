import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  configuredProviders,
  createState,
  isConfigured,
  isProviderId,
  providerDiagnostics,
  readState,
  redirectUri,
} from "./oauth";

/*
 * `state` is the CSRF control for the entire OAuth flow, so the tests that matter
 * are the ones that prove a value this deployment did not mint is refused — and
 * that a `next` pointing off-site cannot ride along inside a valid signature.
 */

describe("oauth state", () => {
  it("round-trips a state it signed", () => {
    const { state, verifier } = createState("/wishlist");
    const read = readState(state);
    assert.ok(read);
    assert.equal(read.next, "/wishlist");
    assert.equal(read.verifier, verifier);
  });

  it("mints a different nonce and verifier every time", () => {
    const a = createState("/");
    const b = createState("/");
    assert.notEqual(a.state, b.state);
    assert.notEqual(a.verifier, b.verifier);
  });

  it("rejects a tampered signature", () => {
    const { state } = createState("/wishlist");
    const [body] = state.split(".");
    assert.equal(readState(`${body}.deadbeef`), null);
  });

  /*
   * The one that matters most: an attacker editing the payload has to forge the
   * signature over it, so a rewritten `next` cannot survive.
   */
  it("rejects a payload edited to redirect off-site", () => {
    const { state } = createState("/wishlist");
    const signature = state.slice(state.lastIndexOf(".") + 1);

    const evil = Buffer.from(
      JSON.stringify({
        nonce: "x",
        next: "https://evil.example.com",
        verifier: "y",
        issuedAt: Date.now(),
      }),
      "utf8",
    ).toString("base64url");

    assert.equal(readState(`${evil}.${signature}`), null);
  });

  /*
   * And belt-and-braces: even a CORRECTLY signed state is refused when `next` is
   * not a same-origin path, so the open-redirect check does not rest on the
   * signature alone.
   */
  it("refuses an off-site next even when properly signed", () => {
    for (const bad of ["https://evil.example.com", "//evil.example.com", "javascript:alert(1)"]) {
      const { state } = createState(bad);
      const read = readState(state);
      // `createState` stores what it is given; `readState` is the gate.
      if (read) assert.ok(read.next.startsWith("/") && !read.next.startsWith("//"), `leaked ${bad}`);
      else assert.equal(read, null);
    }
  });

  it("rejects junk without throwing", () => {
    for (const bad of [undefined, "", ".", "nodot", ".onlysig", "a.b.c"]) {
      assert.equal(readState(bad as string | undefined), null, `for ${JSON.stringify(bad)}`);
    }
  });

  it("expires an old state", () => {
    const { state } = createState("/");
    const [body, signature] = state.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    // Eleven minutes ago, against a ten minute window.
    payload.issuedAt = Date.now() - 11 * 60 * 1000;

    const stale = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    // Re-signed so only the age can be the reason it fails.
    const secret = process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
      ? process.env.AUTH_SECRET
      : "lunowix-development-only-signing-key";
    const resigned = createHmac("sha256", secret).update(stale).digest("base64url");

    assert.equal(readState(`${stale}.${resigned}`), null);
    assert.ok(signature.length > 0);
  });
});

describe("oauth providers", () => {
  it("recognises exactly the three provider ids", () => {
    for (const good of ["google", "github", "facebook"]) assert.equal(isProviderId(good), true);
    for (const bad of ["twitter", "", "GOOGLE", "google "]) assert.equal(isProviderId(bad), false);
  });

  /*
   * Half a credential is not a credential. A deployment with an id but no secret
   * must NOT offer the button, or the person is redirected into a provider error.
   */
  it("needs both halves of a credential to count as configured", () => {
    const saved = { id: process.env.GITHUB_CLIENT_ID, secret: process.env.GITHUB_CLIENT_SECRET };
    try {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
      assert.equal(isConfigured("github"), false);

      process.env.GITHUB_CLIENT_ID = "abc";
      assert.equal(isConfigured("github"), false, "id alone must not count");

      process.env.GITHUB_CLIENT_SECRET = "shh";
      assert.equal(isConfigured("github"), true);

      assert.ok(configuredProviders().some((p) => p.id === "github"));
    } finally {
      if (saved.id === undefined) delete process.env.GITHUB_CLIENT_ID;
      else process.env.GITHUB_CLIENT_ID = saved.id;
      if (saved.secret === undefined) delete process.env.GITHUB_CLIENT_SECRET;
      else process.env.GITHUB_CLIENT_SECRET = saved.secret;
    }
  });

  /*
   * The redirect URI must match what is registered with the provider exactly, and
   * must come from our own configuration rather than the request — a host an
   * attacker can set would send the authorization code to their server.
   */
  it("builds the redirect uri from the configured origin, without a double slash", () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
      assert.equal(redirectUri("google"), "https://example.com/api/auth/oauth/google/callback");

      // A trailing slash in the configured origin must not produce `//api`.
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
      assert.equal(redirectUri("github"), "https://example.com/api/auth/oauth/github/callback");
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = saved;
    }
  });

  /*
   * The diagnostic exists to answer "why is my provider not working", so the
   * property that matters is the one that distinguishes it from
   * `configuredProviders()`: it must still list a provider that is switched OFF.
   * Hiding those would make setup impossible — the callback URL has to be
   * registered with the provider before the credentials exist to enable it.
   */
  it("reports every provider with its callback, including the unconfigured ones", () => {
    const saved = new Map<string, string | undefined>();
    for (const name of ["GOOGLE", "GITHUB", "FACEBOOK"]) {
      for (const half of ["CLIENT_ID", "CLIENT_SECRET"]) {
        const key = `${name}_${half}`;
        saved.set(key, process.env[key]);
        delete process.env[key];
      }
    }
    const savedSite = process.env.NEXT_PUBLIC_SITE_URL;

    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

      const none = providerDiagnostics();
      assert.deepEqual(
        none.map((p) => p.id),
        ["google", "github", "facebook"],
        "all three must appear even with nothing configured",
      );
      assert.equal(none.every((p) => p.configured === false), true);
      assert.equal(
        none.find((p) => p.id === "facebook")?.callback,
        "https://example.com/api/auth/oauth/facebook/callback",
        "an unconfigured provider must still publish the URL to register",
      );

      process.env.GOOGLE_CLIENT_ID = "abc";
      process.env.GOOGLE_CLIENT_SECRET = "shh";
      const some = providerDiagnostics();
      assert.equal(some.find((p) => p.id === "google")?.configured, true);
      assert.equal(some.find((p) => p.id === "github")?.configured, false);
      assert.equal(some.length, 3, "enabling one must not drop the others");

      // The advertised callback has to be the one the flow actually uses.
      for (const entry of some) assert.equal(entry.callback, redirectUri(entry.id));
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      if (savedSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = savedSite;
    }
  });
});
