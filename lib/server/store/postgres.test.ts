import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { type Store } from "./types";

/**
 * The Postgres adapter, against a real server.
 *
 * SKIPPED unless `TEST_DATABASE_URL` is set, so `npm test` stays runnable with
 * no database — but it is not optional in spirit. The adapter is what production
 * runs on, and every one of its behaviours is expressed in SQL that TypeScript
 * cannot check: jsonb containment matching a null value, `count(*)` arriving as a
 * string, `on conflict` updating rather than erroring. A typecheck proves none of
 * that.
 *
 *   docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw -d postgres:16
 *   TEST_DATABASE_URL=postgres://postgres:pw@localhost:5432/postgres npm test
 */

const URL = process.env.TEST_DATABASE_URL;
const skip = URL ? false : "set TEST_DATABASE_URL to run the Postgres adapter tests";

let store: Store;

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  // A local container speaks plaintext; managed providers need the relaxed mode.
  process.env.DATABASE_SSL ??= "disable";

  const { PostgresStore } = await import("./postgres");
  store = new PostgresStore();
  await store.init();

  // Start from a known state without dropping a table someone else may own.
  for (const collection of ["users", "sessions", "wishlist", "reviews", "newsletter", "views"] as const) {
    await store.deleteWhere(collection, { testMarker: true });
  }
});

after(async () => {
  if (!URL) return;
  for (const collection of ["users", "sessions", "wishlist", "reviews", "newsletter", "views"] as const) {
    await store.deleteWhere(collection, { testMarker: true });
  }
});

describe("postgres store", { skip }, () => {
  it("creates its schema idempotently", async () => {
    // Called once in `before`; a second call must not error on the existing table.
    await store.init();
    await store.init();
  });

  it("round-trips a document", async () => {
    await store.put("users", { id: "pg1", email: "a@b.com", role: "member", testMarker: true });
    assert.deepEqual(await store.get("users", "pg1"), {
      id: "pg1",
      email: "a@b.com",
      role: "member",
      testMarker: true,
    });
  });

  it("upserts on conflict rather than erroring on a duplicate id", async () => {
    await store.put("users", { id: "pg1", email: "a@b.com", role: "admin", testMarker: true });
    const found = await store.get<{ id: string; role: string }>("users", "pg1");
    assert.equal(found?.role, "admin");
    assert.equal(await store.count("users", { testMarker: true }), 1);
  });

  it("finds by jsonb containment", async () => {
    await store.put("users", { id: "pg2", email: "c@d.com", role: "member", testMarker: true });
    const admins = await store.find<{ id: string }>("users", { role: "admin", testMarker: true });
    assert.deepEqual(admins.map((row) => row.id), ["pg1"]);
  });

  /*
   * The behaviour the subscriber count depends on, and the one most likely to
   * differ between the two adapters: `data @> '{"unsubscribedAt": null}'` has to
   * match a stored JSON null.
   */
  it("matches a null value through containment", async () => {
    await store.put("newsletter", { id: "x@y.com", unsubscribedAt: null, testMarker: true });
    await store.put("newsletter", { id: "z@y.com", unsubscribedAt: "2026-01-01", testMarker: true });
    assert.equal(await store.count("newsletter", { unsubscribedAt: null, testMarker: true }), 1);
  });

  it("returns a number from count, not the string pg hands back for bigint", async () => {
    const n = await store.count("users", { testMarker: true });
    assert.equal(typeof n, "number");
    assert.equal(n, 2);
  });

  it("deletes, and reports whether anything went", async () => {
    assert.equal(await store.delete("users", "pg2"), true);
    assert.equal(await store.delete("users", "pg2"), false);
  });

  it("deletes by filter and returns the count", async () => {
    await store.put("sessions", { id: "ps1", userId: "u1", testMarker: true });
    await store.put("sessions", { id: "ps2", userId: "u1", testMarker: true });
    await store.put("sessions", { id: "ps3", userId: "u9", testMarker: true });

    assert.equal(await store.deleteWhere("sessions", { userId: "u1", testMarker: true }), 2);
    assert.equal(await store.count("sessions", { testMarker: true }), 1);
  });

  it("reads an empty collection as an empty array", async () => {
    assert.deepEqual(await store.find("views", { testMarker: true }), []);
    assert.equal(await store.get("views", "nothing-here"), null);
  });

  /*
   * The file store needs an in-process lock for this. Postgres does not — each
   * `insert ... on conflict` is its own atomic statement — and this proves the
   * guarantee actually holds rather than assuming it.
   */
  it("does not lose concurrent writes", async () => {
    const ids = Array.from({ length: 20 }, (_, index) => `pw${index}`);
    await Promise.all(
      ids.map((id) => store.put("wishlist", { id, userId: "u1", testMarker: true })),
    );
    assert.equal(await store.count("wishlist", { testMarker: true }), 20);
  });

  it("keeps values that would break naive string interpolation", async () => {
    const nasty = `O'Brien "quoted" \\ {"injected": true} -- ; drop table documents;`;
    await store.put("users", { id: "pg-nasty", name: nasty, testMarker: true });
    const found = await store.get<{ id: string; name: string }>("users", "pg-nasty");
    assert.equal(found?.name, nasty);
  });
});
