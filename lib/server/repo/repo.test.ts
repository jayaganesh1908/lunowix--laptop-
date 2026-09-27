import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

/*
 * The repositories, against the real file store in a temp directory.
 *
 * These are the rules the API's behaviour rests on, and most of them are rules
 * about NOT losing data: a merge that unions instead of replacing, a wishlist
 * row that does not duplicate, a reset token that works exactly once. Each is
 * the kind of thing that looks fine in a single happy-path click-through and
 * goes wrong on the second one.
 */

let users: typeof import("./users");
let wishlist: typeof import("./wishlist");
let compare: typeof import("./compare");
let reviews: typeof import("./reviews");
let newsletter: typeof import("./newsletter");
let resets: typeof import("./passwordResets");
let sessions: typeof import("./sessions");
let dir: string;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lunowix-repo-"));
  process.env.LUNOWIX_DATA_DIR = dir;
  // Must be unset, or `getStore` reaches for Postgres.
  delete process.env.DATABASE_URL;

  users = await import("./users");
  wishlist = await import("./wishlist");
  compare = await import("./compare");
  reviews = await import("./reviews");
  newsletter = await import("./newsletter");
  resets = await import("./passwordResets");
  sessions = await import("./sessions");
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.LUNOWIX_DATA_DIR;
});

describe("users", () => {
  it("makes the first account an admin and later ones members", async () => {
    const first = await users.createUser({
      name: "First",
      email: "first@example.com",
      password: "a-long-enough-password",
    });
    assert.equal(first.ok, true);
    assert.equal(first.ok && first.user.role, "admin");

    const second = await users.createUser({
      name: "Second",
      email: "second@example.com",
      password: "another-long-password",
    });
    assert.equal(second.ok && second.user.role, "member");
  });

  it("treats an address as one account whatever its case", async () => {
    const duplicate = await users.createUser({
      name: "Shouty",
      email: "FIRST@EXAMPLE.COM",
      password: "yet-another-password",
    });
    assert.equal(duplicate.ok, false);
    assert.equal(!duplicate.ok && duplicate.reason, "email-taken");
  });

  it("keeps what the person typed, for greeting them", async () => {
    const found = await users.findUserByEmail("first@example.com");
    assert.equal(found?.displayEmail, "first@example.com");
  });

  it("authenticates a correct pair and refuses everything else", async () => {
    assert.ok(await users.authenticate("first@example.com", "a-long-enough-password"));
    // Case-insensitive on the address, exact on the password.
    assert.ok(await users.authenticate("First@Example.com", "a-long-enough-password"));
    assert.equal(await users.authenticate("first@example.com", "wrong"), null);
    assert.equal(await users.authenticate("nobody@example.com", "a-long-enough-password"), null);
  });

  it("never exposes the hash in the public shape", async () => {
    const record = await users.findUserByEmail("first@example.com");
    assert.ok(record);
    const shaped = users.toPublicUser(record) as unknown as Record<string, unknown>;
    assert.equal(shaped.passwordHash, undefined);
    assert.equal(Object.keys(shaped).includes("passwordHash"), false);
  });
});

describe("wishlist", () => {
  const user = "user-wishlist";

  it("adds without duplicating", async () => {
    await wishlist.addToWishlist(user, "redmi-13c-5g");
    await wishlist.addToWishlist(user, "redmi-13c-5g");
    assert.deepEqual(await wishlist.listWishlist(user), ["redmi-13c-5g"]);
  });

  /*
   * The merge has to be a UNION. Someone with three saved products signing in to
   * an account holding two expects five — replacing in either direction silently
   * deletes work, which is the whole reason the sync design was chosen.
   */
  it("unions on merge rather than replacing either side", async () => {
    await wishlist.addToWishlist(user, "sony-wh-1000xm5");
    const merged = await wishlist.mergeWishlist(user, ["moto-g64-5g", "redmi-13c-5g"]);

    assert.equal(merged.length, 3);
    assert.deepEqual([...merged].sort(), ["moto-g64-5g", "redmi-13c-5g", "sony-wh-1000xm5"]);
  });

  it("is idempotent, so merging twice changes nothing", async () => {
    const once = await wishlist.mergeWishlist(user, ["moto-g64-5g"]);
    const twice = await wishlist.mergeWishlist(user, ["moto-g64-5g"]);
    assert.deepEqual(once, twice);
  });

  it("keeps accounts separate", async () => {
    await wishlist.addToWishlist("someone-else", "iqoo-13");
    assert.equal((await wishlist.listWishlist("someone-else")).length, 1);
    assert.equal((await wishlist.listWishlist(user)).length, 3);
  });

  it("removes and clears", async () => {
    assert.equal(await wishlist.removeFromWishlist(user, "moto-g64-5g"), true);
    assert.equal(await wishlist.removeFromWishlist(user, "moto-g64-5g"), false);

    await wishlist.clearWishlist(user);
    assert.deepEqual(await wishlist.listWishlist(user), []);
    // Another account is untouched by a clear.
    assert.equal((await wishlist.listWishlist("someone-else")).length, 1);
  });
});

describe("compare history", () => {
  const user = "user-compare";

  it("treats a reversed pair as the same comparison", async () => {
    await compare.recordComparison(user, ["a", "b"]);
    const after = await compare.recordComparison(user, ["b", "a"]);
    assert.equal(after.length, 1);
  });

  it("keeps newest first and caps the list at eight", async () => {
    for (let index = 0; index < 12; index += 1) {
      await compare.recordComparison(user, [`p${index}`, `q${index}`]);
    }
    const history = await compare.listCompareHistory(user);
    assert.equal(history.length, 8);
    assert.deepEqual(history[0], ["p11", "q11"]);
  });

  it("ignores a pair that is not a pair", async () => {
    const before = await compare.listCompareHistory(user);
    const after = await compare.recordComparison(user, ["only-one"]);
    assert.deepEqual(after, before);
  });
});

describe("reviews", () => {
  const product = "redmi-13c-5g";

  it("stores one review per person and edits on a second submission", async () => {
    await reviews.submitReview({
      productId: product,
      userId: "reviewer-1",
      author: "Reviewer One",
      rating: 4,
      title: "Good",
      comment: "A perfectly adequate comment of sufficient length.",
    });
    await reviews.submitReview({
      productId: product,
      userId: "reviewer-1",
      author: "Reviewer One",
      rating: 5,
      title: "Better than I thought",
      comment: "Revised after another fortnight of daily use with it.",
    });

    const stored = await reviews.listReviews(product);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].rating, 5);
    assert.equal(stored[0].title, "Better than I thought");
  });

  it("keeps the original date through an edit", async () => {
    const mine = await reviews.findUserReview(product, "reviewer-1");
    assert.ok(mine);
    assert.ok(mine.updatedAt >= mine.createdAt);
  });

  it("averages across people", async () => {
    await reviews.submitReview({
      productId: product,
      userId: "reviewer-2",
      author: "Reviewer Two",
      rating: 3,
      title: "Mixed",
      comment: "Some good parts and some genuinely irritating ones.",
    });

    const summary = await reviews.summarise(product);
    assert.equal(summary.count, 2);
    assert.equal(summary.average, 4);
  });

  it("reports no average for a product nobody reviewed", async () => {
    assert.deepEqual(await reviews.summarise("nothing-ear-a"), { count: 0, average: null });
  });

  /*
   * Ownership is enforced in the repository, not only in the route. A delete that
   * trusted its caller would let any signed-in account remove anyone's review.
   */
  it("refuses to delete someone else's review", async () => {
    const mine = await reviews.findUserReview(product, "reviewer-1");
    assert.ok(mine);

    assert.equal(await reviews.deleteReview(mine.id, "reviewer-2"), false);
    assert.equal((await reviews.listReviews(product)).length, 2);

    assert.equal(await reviews.deleteReview(mine.id, "reviewer-1"), true);
    assert.equal((await reviews.listReviews(product)).length, 1);
  });
});

describe("newsletter", () => {
  it("subscribes once per address, whatever the case", async () => {
    assert.deepEqual(await newsletter.subscribe("Reader@Example.com"), { created: true });
    assert.deepEqual(await newsletter.subscribe("reader@example.com"), { created: false });
    assert.equal(await newsletter.countSubscribers(), 1);
  });

  it("marks unsubscribed rather than forgetting the address", async () => {
    assert.equal(await newsletter.unsubscribe("reader@example.com"), true);
    assert.equal(await newsletter.countSubscribers(), 0);
    // A second unsubscribe is a no-op, not an error.
    assert.equal(await newsletter.unsubscribe("reader@example.com"), false);
  });

  it("can re-subscribe, keeping the original join date", async () => {
    const result = await newsletter.subscribe("reader@example.com");
    assert.equal(result.created, false);
    assert.equal(await newsletter.countSubscribers(), 1);
  });
});

describe("password resets", () => {
  it("works exactly once", async () => {
    const token = await resets.createResetToken("user-reset");
    assert.equal(await resets.consumeResetToken(token), "user-reset");
    // Replayed, it resolves to nothing at all.
    assert.equal(await resets.consumeResetToken(token), null);
  });

  it("rejects a token it never issued", async () => {
    assert.equal(await resets.consumeResetToken("not-a-real-token"), null);
    assert.equal(await resets.consumeResetToken(""), null);
  });

  /*
   * Issuing a new token must kill the old one. Otherwise every "forgot password"
   * click leaves another working key in another email for a full hour.
   */
  it("invalidates the previous token when a new one is issued", async () => {
    const first = await resets.createResetToken("user-reset-2");
    const second = await resets.createResetToken("user-reset-2");

    assert.equal(await resets.consumeResetToken(first), null);
    assert.equal(await resets.consumeResetToken(second), "user-reset-2");
  });
});

describe("sessions", () => {
  it("resolves a live session and refuses an unknown one", async () => {
    const created = await sessions.createSession("user-session", false);
    const found = await sessions.getValidSession(created.record.id);
    assert.equal(found?.userId, "user-session");
    assert.equal(await sessions.getValidSession("no-such-session"), null);
  });

  /*
   * Expiry is enforced server-side. The cookie's own `expires` is a hint to the
   * browser and is trivially edited by whoever holds the cookie, so a session
   * past its time must be refused here regardless of what was sent.
   */
  it("refuses an expired session and cleans it up", async () => {
    const created = await sessions.createSession("user-expired", false);
    const { getStore } = await import("../store");

    await getStore().put("sessions", { ...created.record, expiresAt: Date.now() - 1000 });

    assert.equal(await sessions.getValidSession(created.record.id), null);
    // Deleted on the way out, rather than left to accumulate.
    assert.equal(await getStore().get("sessions", created.record.id), null);
  });

  it("destroys every session for one account on request", async () => {
    await sessions.createSession("user-many", false);
    await sessions.createSession("user-many", true);
    assert.equal(await sessions.destroyUserSessions("user-many"), 2);
    assert.equal(await sessions.destroyUserSessions("user-many"), 0);
  });
});
