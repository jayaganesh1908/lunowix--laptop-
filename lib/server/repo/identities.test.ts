import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { type OAuthProfile } from "../auth/oauth";

/*
 * Linking a provider identity to an existing account.
 *
 * The second test here is the one that matters. Anyone can open an account at a
 * provider claiming someone else's email address. If this code linked on that
 * claim alone, signing in with an unverified provider account would hand over the
 * matching Lunowix account — password, wishlist, admin role and all. It has to
 * refuse, and that refusal needs a test, because the insecure version behaves
 * identically in every happy path.
 */

let identities: typeof import("./identities");
let users: typeof import("./users");
let dir: string;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lunowix-oauth-"));
  process.env.LUNOWIX_DATA_DIR = dir;
  delete process.env.DATABASE_URL;

  identities = await import("./identities");
  users = await import("./users");
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.LUNOWIX_DATA_DIR;
});

const profile = (over: Partial<OAuthProfile> = {}): OAuthProfile => ({
  providerAccountId: "provider-account-1",
  email: "someone@example.com",
  emailVerified: true,
  name: "Someone",
  ...over,
});

describe("oauth account linking", () => {
  it("creates an account on a first sign-in, and makes the first one admin", async () => {
    const result = await identities.linkOrCreate("google", profile());
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.created);
    assert.equal(result.ok && result.user.email, "someone@example.com");
    // First account on a deployment, however it was created.
    assert.equal(result.ok && result.user.role, "admin");
  });

  it("returns the same account on a second sign-in, without creating another", async () => {
    const again = await identities.linkOrCreate("google", profile());
    assert.equal(again.ok, true);
    assert.equal(again.ok && again.created, false);
    assert.equal(await users.countUsers(), 1);
  });

  /**
   * THE important one.
   *
   * A different provider account, claiming an email a password account already
   * holds, with the provider NOT vouching for it. Linking would be account
   * takeover, so it must be refused.
   */
  it("refuses to link an unverified email to an existing account", async () => {
    const created = await users.createUser({
      name: "Real Owner",
      email: "owner@example.com",
      password: "a-long-enough-passphrase",
    });
    assert.equal(created.ok, true);

    const attacker = await identities.linkOrCreate(
      "facebook",
      profile({
        providerAccountId: "attacker-account",
        email: "owner@example.com",
        emailVerified: false,
      }),
    );

    assert.equal(attacker.ok, false);
    assert.equal(!attacker.ok && attacker.reason, "email-unverified");

    // And nothing was written: no new account, no identity row.
    assert.equal(await users.countUsers(), 2);
    assert.deepEqual(await identities.providersFor(created.ok ? created.user.id : ""), []);
  });

  it("does link when the provider DOES vouch for the email", async () => {
    const owner = await users.findUserByEmail("owner@example.com");
    assert.ok(owner);

    const linked = await identities.linkOrCreate(
      "google",
      profile({
        providerAccountId: "genuine-account",
        email: "owner@example.com",
        emailVerified: true,
      }),
    );

    assert.equal(linked.ok, true);
    assert.equal(linked.ok && linked.created, false);
    assert.equal(linked.ok && linked.user.id, owner.id);
    assert.deepEqual(await identities.providersFor(owner.id), ["google"]);
  });

  it("refuses when the provider returns no email at all", async () => {
    const none = await identities.linkOrCreate(
      "github",
      profile({ providerAccountId: "no-email-account", email: null }),
    );
    assert.equal(none.ok, false);
    assert.equal(!none.ok && none.reason, "no-email");
  });

  /**
   * An account created through a provider has no password, and no password may
   * ever sign into it. Its owner can get one through the reset flow, which proves
   * they control the inbox.
   */
  it("creates a passwordless account that no password can sign into", async () => {
    const result = await identities.linkOrCreate(
      "github",
      profile({
        providerAccountId: "oauth-only-account",
        email: "oauth-only@example.com",
        emailVerified: true,
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.user.passwordHash, "");

    for (const attempt of ["", " ", "password", "oauth-only@example.com"]) {
      assert.equal(
        await users.authenticate("oauth-only@example.com", attempt),
        null,
        `password ${JSON.stringify(attempt)} must not work`,
      );
    }
  });

  it("keeps the same email distinct per provider account id", async () => {
    // A second Google account that happens to use an address nobody holds yet.
    const fresh = await identities.linkOrCreate(
      "google",
      profile({ providerAccountId: "another-google", email: "another@example.com" }),
    );
    assert.equal(fresh.ok, true);
    assert.equal(fresh.ok && fresh.created, true);
  });
});
