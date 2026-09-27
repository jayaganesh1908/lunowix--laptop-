import "server-only";

import {
  randomBytes,
  scrypt as scryptCallback,
  type ScryptOptions,
  timingSafeEqual,
} from "node:crypto";

/**
 * `promisify` picks the 3-argument overload of `scrypt`, which drops the options
 * parameter the cost factors travel in. Wrapped by hand so the options are typed.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * Password hashing with scrypt from `node:crypto`.
 *
 * scrypt rather than bcrypt/argon2 because it is memory-hard, it is in the
 * standard library, and it therefore adds no native build step to a deployment
 * — which matters on the free tiers this is meant to run on, where a failed
 * `node-gyp` build is a common way to lose an afternoon.
 *
 * Stored as `scrypt$N$r$p$salt$hash`, all base64url. The parameters travel WITH
 * the hash so raising them later does not invalidate existing passwords: an old
 * hash keeps verifying against its own cost, and `needsRehash` reports that it
 * should be upgraded on the owner's next successful sign-in.
 */

/**
 * ~64 MiB and roughly 100ms on a small shared vCPU, which is the right order
 * for an interactive login. `maxmem` must be raised explicitly — Node's 32 MiB
 * default is below what these parameters need and the call would throw.
 */
interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

const PARAMS: ScryptCost = { N: 2 ** 16, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAXMEM = 256 * 1024 * 1024;

const b64 = (buffer: Buffer) => buffer.toString("base64url");

function derive(password: string, salt: Buffer, params: ScryptCost): Promise<Buffer> {
  return scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...params, maxmem: MAXMEM });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(password, salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${b64(salt)}$${b64(hash)}`;
}

/**
 * Constant-time comparison, and it never throws on a malformed stored value —
 * a corrupt row must read as "wrong password", not as a 500 that tells an
 * attacker the record exists.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const params = { N: Number(n), r: Number(r), p: Number(p) };
    if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
      return false;
    }

    const expected = Buffer.from(hashB64, "base64url");
    const actual = await derive(password, Buffer.from(saltB64, "base64url"), params);

    // `timingSafeEqual` throws on a length mismatch, so check that first.
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** True when `stored` was made with weaker parameters than the current ones. */
export function needsRehash(stored: string): boolean {
  const [scheme, n, r, p] = stored.split("$");
  if (scheme !== "scrypt") return true;
  return Number(n) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p;
}
