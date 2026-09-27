import "server-only";

import { randomUUID } from "node:crypto";
import { getStore } from "../store";
import { type Doc } from "../store/types";
import { normaliseEmail, type UserRecord } from "./users";
import { type OAuthProfile, type ProviderId } from "../auth/oauth";

/**
 * Links a provider account to a Lunowix account.
 *
 * One row per (provider, provider account id), keyed on exactly that — never on
 * the email. A provider account id is stable for the life of the account; an
 * email is not, and someone who changes their Google address must still land on
 * the same Lunowix account.
 */

export interface IdentityRecord extends Doc {
  /** `${provider}:${providerAccountId}` */
  id: string;
  provider: ProviderId;
  providerAccountId: string;
  userId: string;
  createdAt: string;
}

const rowId = (provider: ProviderId, providerAccountId: string) =>
  `${provider}:${providerAccountId}`;

export type LinkResult =
  | { ok: true; user: UserRecord; created: boolean }
  /** An account holds this email, but the provider did not vouch for it. */
  | { ok: false; reason: "email-unverified" }
  /** The provider returned no email, so there is nothing to create an account from. */
  | { ok: false; reason: "no-email" };

/**
 * Resolves a provider profile to an account, creating or linking as needed.
 *
 * Three paths, in order:
 *
 *  1. **Known identity** — this provider account has signed in before. Return its
 *     user. No email involved, so nothing to check.
 *
 *  2. **Known email** — no identity row yet, but an account already holds this
 *     address. Link them, but ONLY if the provider asserts the email is verified.
 *     This is the security-critical branch: anyone can open an account at a
 *     provider claiming someone else's address, so linking on an unverified claim
 *     would hand them that Lunowix account, password and all. Refused rather than
 *     guessed.
 *
 *  3. **Neither** — create a new account. It has no password, so
 *     `passwordHash: ""`, which `verifyPassword` can never match: an OAuth-only
 *     account cannot be signed into with a password until its owner sets one
 *     through the reset flow, which proves they control the inbox.
 */
export async function linkOrCreate(
  provider: ProviderId,
  profile: OAuthProfile,
): Promise<LinkResult> {
  const store = getStore();
  const id = rowId(provider, profile.providerAccountId);

  // 1. Seen this provider account before.
  const existing = await store.get<IdentityRecord>("identities", id);
  if (existing) {
    const user = await store.get<UserRecord>("users", existing.userId);
    if (user) return { ok: true, user, created: false };
    // The account was deleted but its identity row survived. Drop the orphan and
    // fall through to create a fresh account.
    await store.delete("identities", id);
  }

  if (!profile.email) return { ok: false, reason: "no-email" };

  const email = normaliseEmail(profile.email);
  const byEmail = await store.findOne<UserRecord>("users", { email });

  // 2. An account already holds this address.
  if (byEmail) {
    if (!profile.emailVerified) return { ok: false, reason: "email-unverified" };

    await store.put<IdentityRecord>("identities", {
      id,
      provider,
      providerAccountId: profile.providerAccountId,
      userId: byEmail.id,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, user: byEmail, created: false };
  }

  // 3. Brand new person.
  const now = new Date().toISOString();

  /*
   * The first account on a deployment is still the admin, however it was created.
   * Signing in with Google on a fresh install makes you the admin, exactly as
   * registering with a password would.
   */
  const isFirstUser = (await store.count("users")) === 0;

  const user: UserRecord = {
    id: randomUUID(),
    email,
    displayEmail: profile.email.trim(),
    name: profile.name?.trim() || profile.email.split("@")[0],
    // Never matches any password; see `verifyPassword`.
    passwordHash: "",
    role: isFirstUser ? "admin" : "member",
    createdAt: now,
    updatedAt: now,
  };

  await store.put("users", user);
  await store.put<IdentityRecord>("identities", {
    id,
    provider,
    providerAccountId: profile.providerAccountId,
    userId: user.id,
    createdAt: now,
  });

  return { ok: true, user, created: true };
}

/** Which providers an account can sign in with. For a future account settings page. */
export async function providersFor(userId: string): Promise<ProviderId[]> {
  const rows = await getStore().find<IdentityRecord>("identities", { userId });
  return rows.map((row) => row.provider);
}
