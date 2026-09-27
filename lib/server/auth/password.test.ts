import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, needsRehash, verifyPassword } from "./password";

/*
 * Password hashing is the one place in this codebase where a silent bug is a
 * breach rather than a glitch: a `verifyPassword` that returns true too readily
 * lets anyone into any account, and one that mangles its own format locks
 * everybody out. Neither failure shows up in the UI until it matters.
 */

describe("password hashing", () => {
  it("does not store the password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    assert.ok(!stored.includes("correct-horse-battery-staple"));
  });

  it("accepts the right password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    assert.equal(await verifyPassword("correct-horse-battery-staple", stored), true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    assert.equal(await verifyPassword("correct-horse-battery-stapl", stored), false);
    assert.equal(await verifyPassword("", stored), false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    assert.notEqual(a, b);
    // Both still verify: the salt travels with the hash.
    assert.equal(await verifyPassword("same-password", a), true);
    assert.equal(await verifyPassword("same-password", b), true);
  });

  it("records its parameters in the stored value", async () => {
    const stored = await hashPassword("whatever");
    const [scheme, n, r, p] = stored.split("$");
    assert.equal(scheme, "scrypt");
    assert.equal(Number(n), 65536);
    assert.equal(Number(r), 8);
    assert.equal(Number(p), 1);
  });

  /*
   * A corrupt or truncated stored value must read as "wrong password". If it
   * threw, the route would 500 — and a 500 on some addresses and a 401 on others
   * tells an attacker which records exist.
   */
  it("treats a malformed stored hash as a mismatch, never a throw", async () => {
    for (const bad of ["", "not-a-hash", "scrypt$", "scrypt$a$b$c$d$e", "bcrypt$1$2$3$4$5"]) {
      assert.equal(await verifyPassword("anything", bad), false, `for ${JSON.stringify(bad)}`);
    }
  });

  it("verifies a hash made with weaker parameters, and flags it for upgrade", async () => {
    /*
     * Hand-built at N=16384 to stand in for an older stored password. The point
     * is that raising the cost must not lock existing accounts out — the
     * parameters are read from the stored value, not assumed.
     */
    const { scryptSync, randomBytes } = await import("node:crypto");
    const salt = randomBytes(16);
    const key = scryptSync("legacy-password", salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    });
    const legacy = `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;

    assert.equal(await verifyPassword("legacy-password", legacy), true);
    assert.equal(await verifyPassword("wrong", legacy), false);
    assert.equal(needsRehash(legacy), true);
  });

  it("does not flag a current hash for upgrade", async () => {
    assert.equal(needsRehash(await hashPassword("current")), false);
  });

  it("normalises unicode, so the same typed phrase verifies either way", async () => {
    // "café" as e + combining accent, versus the precomposed é.
    const decomposed = "café-password";
    const precomposed = "café-password";
    assert.notEqual(decomposed, precomposed);

    const stored = await hashPassword(decomposed);
    assert.equal(await verifyPassword(precomposed, stored), true);
  });
});
