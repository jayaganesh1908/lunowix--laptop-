import "server-only";

import { getStore } from "../store";
import { type Doc } from "../store/types";
import { issueToken } from "../auth/session";

export interface SessionRecord extends Doc {
  id: string;
  userId: string;
  createdAt: string;
  /** Epoch ms. Compared numerically, so no date parsing on the read path. */
  expiresAt: number;
}

export async function createSession(userId: string, remember: boolean) {
  const token = issueToken(remember);
  const record: SessionRecord = {
    id: token.id,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: token.expiresAt,
  };
  await getStore().put("sessions", record);
  return { record, cookieValue: token.value, expiresAt: token.expiresAt };
}

/**
 * Resolves a session id, deleting it if it has expired.
 *
 * Expiry is enforced HERE rather than trusted from the cookie's own `expires`
 * attribute, which is a hint to the browser and is trivially edited by whoever
 * holds the cookie.
 */
export async function getValidSession(id: string): Promise<SessionRecord | null> {
  const store = getStore();
  const session = await store.get<SessionRecord>("sessions", id);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    await store.delete("sessions", id);
    return null;
  }
  return session;
}

export async function destroySession(id: string): Promise<boolean> {
  return getStore().delete("sessions", id);
}

/** Every session for a user. Used when a password changes. */
export async function destroyUserSessions(userId: string): Promise<number> {
  return getStore().deleteWhere("sessions", { userId });
}

/**
 * Housekeeping for expired rows.
 *
 * `getValidSession` already refuses an expired session, so this is only about
 * not accumulating dead rows forever. It is called opportunistically from the
 * login path rather than on a schedule, because a cron job is one more thing to
 * deploy and the cost here is a single sweep on an infrequent request.
 */
export async function pruneExpiredSessions(): Promise<number> {
  const store = getStore();
  const now = Date.now();
  const all = await store.find<SessionRecord>("sessions");
  const expired = all.filter((session) => session.expiresAt <= now);
  await Promise.all(expired.map((session) => store.delete("sessions", session.id)));
  return expired.length;
}
