import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { type Store } from "./types";

/*
 * The file store is the default adapter, so a fresh clone exercises this code on
 * its first request. Its riskiest property is the one a single-threaded test
 * would never notice: `put` is a read-modify-write, and two of them in flight at
 * once can silently lose one. That is the last test here, and it is the reason
 * the in-process lock exists.
 */

let store: Store;
let dir: string;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lunowix-store-"));
  // Read at module load, so it has to be set before the import below.
  process.env.LUNOWIX_DATA_DIR = dir;

  const { FileStore } = await import("./file");
  store = new FileStore();
  await store.init();
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.LUNOWIX_DATA_DIR;
});

describe("file store", () => {
  it("reads an absent collection as empty rather than failing", async () => {
    assert.deepEqual(await store.find("users"), []);
    assert.equal(await store.count("users"), 0);
    assert.equal(await store.get("users", "nobody"), null);
  });

  it("round-trips a document", async () => {
    await store.put("users", { id: "u1", email: "a@b.com", role: "member" });
    assert.deepEqual(await store.get("users", "u1"), {
      id: "u1",
      email: "a@b.com",
      role: "member",
    });
  });

  it("replaces rather than duplicating on the same id", async () => {
    await store.put("users", { id: "u1", email: "a@b.com", role: "admin" });
    assert.equal(await store.count("users"), 1);
    const found = await store.get<{ id: string; role: string }>("users", "u1");
    assert.equal(found?.role, "admin");
  });

  it("finds by field equality", async () => {
    await store.put("users", { id: "u2", email: "c@d.com", role: "member" });
    const admins = await store.find<{ id: string }>("users", { role: "admin" });
    assert.deepEqual(admins.map((row) => row.id), ["u1"]);
    assert.equal(await store.findOne("users", { email: "nope@nope.com" }), null);
  });

  it("matches on a null value, which the subscriber count depends on", async () => {
    await store.put("newsletter", { id: "x@y.com", unsubscribedAt: null });
    await store.put("newsletter", { id: "z@y.com", unsubscribedAt: "2026-01-01" });
    assert.equal(await store.count("newsletter", { unsubscribedAt: null }), 1);
  });

  it("deletes, and reports whether anything went", async () => {
    assert.equal(await store.delete("users", "u2"), true);
    assert.equal(await store.delete("users", "u2"), false);
  });

  it("deletes by filter and returns the count", async () => {
    await store.put("sessions", { id: "s1", userId: "u1" });
    await store.put("sessions", { id: "s2", userId: "u1" });
    await store.put("sessions", { id: "s3", userId: "u9" });

    assert.equal(await store.deleteWhere("sessions", { userId: "u1" }), 2);
    assert.equal(await store.count("sessions"), 1);
    assert.equal(await store.deleteWhere("sessions", { userId: "gone" }), 0);
  });

  /*
   * The regression this adapter's lock exists for.
   *
   * Every `put` reads the whole file, splices one document in and writes it
   * back. Without serialisation, fifteen concurrent puts all read the same
   * starting state and the last writer wins — so the collection ends up holding
   * one document instead of fifteen. It fails loudly here and would otherwise
   * fail as "my account disappeared" in production.
   */
  it("does not lose concurrent writes to one collection", async () => {
    const ids = Array.from({ length: 15 }, (_, index) => `w${index}`);
    await Promise.all(ids.map((id) => store.put("wishlist", { id, userId: "u1" })));

    assert.equal(await store.count("wishlist"), 15);
    const stored = await store.find<{ id: string }>("wishlist");
    assert.deepEqual(stored.map((row) => row.id).sort(), [...ids].sort());
  });

  it("survives a corrupt JSON file by treating it as empty", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(dir, "views.json"), "{ not json at all", "utf8");
    assert.deepEqual(await store.find("views"), []);
  });
});
