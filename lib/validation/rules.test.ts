import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkEmail,
  checkName,
  checkPassword,
  checkRating,
  checkReviewComment,
  checkReviewTitle,
  PASSWORD_MAX,
  PASSWORD_MIN,
  REVIEW_COMMENT_MIN,
} from "./rules";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  reviewSchema,
} from "@/lib/server/validation";

/*
 * These rules are enforced twice — here in the browser, and with zod on the
 * server — so the thing worth testing is that the two AGREE. A client check that
 * is stricter silently blocks valid input; one that is looser sends the visitor a
 * 422 for something the form said was fine.
 *
 * Both sides read their bounds from `rules.ts`, so these tests are what proves
 * that sharing actually worked rather than merely looking like it did.
 */

/** Runs a value through both, and asserts they reach the same verdict. */
function agree(
  value: string,
  clientCheck: (value: string) => string | null,
  schema: { safeParse: (value: unknown) => { success: boolean } },
) {
  const clientOk = clientCheck(value) === null;
  const serverOk = schema.safeParse(value).success;
  assert.equal(
    clientOk,
    serverOk,
    `disagreement on ${JSON.stringify(value.slice(0, 40))}: client ${clientOk}, server ${serverOk}`,
  );
  return clientOk;
}

describe("shared field rules", () => {
  it("agrees with the server on names", () => {
    assert.equal(agree("Jai", checkName, nameSchema), true);
    assert.equal(agree("  Jai  ", checkName, nameSchema), true);
    assert.equal(agree("J", checkName, nameSchema), false);
    assert.equal(agree("", checkName, nameSchema), false);
    assert.equal(agree("x".repeat(81), checkName, nameSchema), false);
  });

  it("agrees with the server on passwords", () => {
    assert.equal(agree("a".repeat(PASSWORD_MIN), checkPassword, passwordSchema), true);
    assert.equal(agree("a".repeat(PASSWORD_MIN - 1), checkPassword, passwordSchema), false);
    assert.equal(agree("a".repeat(PASSWORD_MAX), checkPassword, passwordSchema), true);
    assert.equal(agree("a".repeat(PASSWORD_MAX + 1), checkPassword, passwordSchema), false);
  });

  it("does not trim a password, because a space is part of it", () => {
    // Seven characters plus a trailing space: eight, and acceptable.
    assert.equal(checkPassword("abcdefg "), null);
  });

  it("agrees with the server on ordinary and malformed emails", () => {
    for (const good of ["jai@example.com", "a.b+c@sub.example.co.in", "  x@y.dev  "]) {
      assert.equal(agree(good, checkEmail, emailSchema), true, good);
    }
    for (const bad of ["", "jai", "jai@", "@example.com", "jai example.com", "jai@example"]) {
      assert.equal(agree(bad, checkEmail, emailSchema), false, bad);
    }
  });

  it("agrees with the server on review bodies", () => {
    const titleSchema = { safeParse: (v: unknown) => reviewSchema.shape.title.safeParse(v) };
    const commentSchema = { safeParse: (v: unknown) => reviewSchema.shape.comment.safeParse(v) };

    assert.equal(agree("Good", checkReviewTitle, titleSchema), true);
    assert.equal(agree("Go", checkReviewTitle, titleSchema), false);
    assert.equal(agree("x".repeat(121), checkReviewTitle, titleSchema), false);

    assert.equal(agree("a".repeat(REVIEW_COMMENT_MIN), checkReviewComment, commentSchema), true);
    assert.equal(
      agree("a".repeat(REVIEW_COMMENT_MIN - 1), checkReviewComment, commentSchema),
      false,
    );
    assert.equal(agree("a".repeat(4001), checkReviewComment, commentSchema), false);
  });

  /*
   * Whitespace counts for neither side. A comment of twenty spaces must fail
   * both, or the form accepts an empty review the route then rejects.
   */
  it("counts trimmed length on both sides", () => {
    const commentSchema = { safeParse: (v: unknown) => reviewSchema.shape.comment.safeParse(v) };
    assert.equal(agree(" ".repeat(40), checkReviewComment, commentSchema), false);
  });

  it("accepts only whole ratings from 1 to 5", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      assert.equal(checkRating(value), null, `for ${value}`);
      assert.equal(reviewSchema.shape.rating.safeParse(value).success, true);
    }
    for (const value of [0, 6, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.ok(checkRating(value), `should reject ${value}`);
      assert.equal(reviewSchema.shape.rating.safeParse(value).success, false, `for ${value}`);
    }
  });
});
