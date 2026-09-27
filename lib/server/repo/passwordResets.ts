import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getStore } from "../store";
import { type Doc } from "../store/types";

/**
 * Password reset tokens.
 *
 * The token is emailed; only its SHA-256 HASH is stored. A reset token is a
 * bearer credential for an account, so a dump of this collection must not be
 * usable to take one over — the same reason passwords are not stored either.
 * Plain SHA-256 is right here where it is wrong for a password: the token is 32
 * bytes of CSPRNG output, so there is no dictionary to attack and nothing for a
 * slow KDF to defend.
 */

/** Short, because it is a live credential sitting in an inbox. */
const TTL_MS = 60 * 60 * 1000;

export interface ResetRecord extends Doc {
  /** The token's hash, which is also the lookup key. */
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
  usedAt: string | null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Mints a token, stores its hash, and returns the token to email. */
export async function createResetToken(userId: string): Promise<string> {
  const store = getStore();

  /*
   * Any outstanding token for this account is invalidated first.
   *
   * Otherwise every "forgot password" click leaves another working key in
   * another email, and the oldest one stays valid for its full hour.
   */
  await store.deleteWhere("passwordResets", { userId });

  const token = randomBytes(32).toString("base64url");

  await store.put<ResetRecord>("passwordResets", {
    id: hashToken(token),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + TTL_MS,
    usedAt: null,
  });

  return token;
}

/**
 * Resolves a token to its account, if it is live.
 *
 * The stored hash is compared in constant time. The lookup is by hash, so an
 * attacker cannot learn anything from a miss — but comparing the two digests
 * with `timingSafeEqual` costs nothing and keeps the pattern honest.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const store = getStore();
  const id = hashToken(token);

  const record = await store.get<ResetRecord>("passwordResets", id);
  if (!record) return null;

  const a = Buffer.from(record.id, "hex");
  const b = Buffer.from(id, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (record.usedAt || record.expiresAt <= Date.now()) {
    await store.delete("passwordResets", id);
    return null;
  }

  // Single use: deleted, not flagged, so a replay finds nothing at all.
  await store.delete("passwordResets", id);
  return record.userId;
}
