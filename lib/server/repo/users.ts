import "server-only";

import { randomUUID } from "node:crypto";
import { getStore } from "../store";
import { hashPassword, needsRehash, verifyPassword } from "../auth/password";
import { type Doc } from "../store/types";

/**
 * Accounts.
 *
 * `role` mirrors `UserRole` in `@/lib/types` ("member" | "editor" | "admin"),
 * NOT the title-case variant the admin demo table uses. Lower case is the
 * stored form; presentation capitalises it.
 */

export interface UserRecord extends Doc {
  id: string;
  /** Lower-cased at write time; see `normaliseEmail`. */
  email: string;
  /** What the person actually typed, for greeting them correctly. */
  displayEmail: string;
  name: string;
  passwordHash: string;
  role: "member" | "editor" | "admin";
  createdAt: string;
  updatedAt: string;
}

/** What may cross the wire. Never the hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRecord["role"];
  createdAt: string;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.displayEmail,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Lower-cased and trimmed, so `Jai@Example.com` and `jai@example.com` are one
 * account. Stored separately from `displayEmail` because the local part of an
 * address is technically case-sensitive and rewriting what someone typed is
 * rude — but treating them as two accounts is worse, and is how duplicate
 * registrations happen.
 */
export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return getStore().findOne<UserRecord>("users", { email: normaliseEmail(email) });
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  return getStore().get<UserRecord>("users", id);
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

/**
 * Creates an account, or reports the address is taken.
 *
 * There is a race here that this design cannot close: two simultaneous
 * registrations for one address both see "not taken" and both insert. The
 * document store has no unique index on a jsonb field to lean on. The
 * consequence is two rows where one was wanted, not a security hole — sign-in
 * resolves to whichever `findOne` returns and the other is inert. Worth knowing
 * about; not worth a distributed lock at this scale.
 */
export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true; user: UserRecord } | { ok: false; reason: "email-taken" }> {
  const email = normaliseEmail(input.email);
  if (await findUserByEmail(email)) return { ok: false, reason: "email-taken" };

  const now = new Date().toISOString();
  const store = getStore();

  /*
   * The first account to exist becomes the admin.
   *
   * Someone has to be, the alternative is an admin dashboard nobody can open,
   * and "whoever set the site up registers first" is how this is conventionally
   * bootstrapped. Every later account is a member.
   */
  const isFirstUser = (await store.count("users")) === 0;

  const user: UserRecord = {
    id: randomUUID(),
    email,
    displayEmail: input.email.trim(),
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    role: isFirstUser ? "admin" : "member",
    createdAt: now,
    updatedAt: now,
  };

  await store.put("users", user);
  return { ok: true, user };
}

/**
 * Checks a credential pair.
 *
 * When the address is unknown it still runs a verification against a throwaway
 * hash. Returning early would make "no such account" measurably faster than
 * "wrong password", which turns the login form into an oracle for which
 * addresses are registered.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<UserRecord | null> {
  const user = await findUserByEmail(email);

  if (!user) {
    await verifyPassword(
      password,
      "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return null;

  // Transparently upgrade a hash made with older parameters.
  if (needsRehash(user.passwordHash)) {
    user.passwordHash = await hashPassword(password);
    user.updatedAt = new Date().toISOString();
    await getStore().put("users", user);
  }

  return user;
}

export async function updatePassword(userId: string, password: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;
  user.passwordHash = await hashPassword(password);
  user.updatedAt = new Date().toISOString();
  await getStore().put("users", user);
  return true;
}

export async function countUsers(): Promise<number> {
  return getStore().count("users");
}

export async function listUsers(): Promise<UserRecord[]> {
  return getStore().find<UserRecord>("users");
}
