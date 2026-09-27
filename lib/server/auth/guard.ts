import "server-only";

import { cookies } from "next/headers";
import { getValidSession } from "../repo/sessions";
import { findUserById, toPublicUser, type PublicUser, type UserRecord } from "../repo/users";
import { SESSION_COOKIE, readToken } from "./session";

/**
 * Resolves the signed-in account for the current request, or null.
 *
 * Three things have to hold, in this order, and the cheapest goes first: the
 * cookie's HMAC has to verify (no I/O), the session record has to exist and be
 * unexpired (one read), and the user it points at has to still exist (one more).
 * That last check is not paranoia — a deleted account with a live session would
 * otherwise keep acting as itself until the session aged out.
 */
export async function currentUser(): Promise<UserRecord | null> {
  const store = await cookies();
  const id = readToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;

  const session = await getValidSession(id);
  if (!session) return null;

  return findUserById(session.userId);
}

export async function currentPublicUser(): Promise<PublicUser | null> {
  const user = await currentUser();
  return user ? toPublicUser(user) : null;
}

/** The session id for the current request, for logout. */
export async function currentSessionId(): Promise<string | null> {
  const store = await cookies();
  return readToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * For routes that require an account.
 *
 * Returns a union rather than throwing so the route stays a straight line of
 * guards — see `lib/server/http.ts`.
 */
export async function requireUser(): Promise<
  { ok: true; user: UserRecord } | { ok: false; reason: "unauthenticated" }
> {
  const user = await currentUser();
  return user ? { ok: true, user } : { ok: false, reason: "unauthenticated" };
}

/** For the admin surfaces. `editor` is not enough. */
export async function requireAdmin(): Promise<
  { ok: true; user: UserRecord } | { ok: false; reason: "unauthenticated" | "forbidden" }
> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  if (user.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, user };
}
