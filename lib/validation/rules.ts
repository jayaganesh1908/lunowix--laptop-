/**
 * The field rules, as plain data and pure functions. No zod, no `server-only`.
 *
 * Both sides validate, and the numbers and messages live here exactly once, so
 * they cannot disagree — the failure this avoids is one endpoint accepting a
 * 19-character review the other rejects, with no error anywhere to explain it.
 *
 * It is deliberately NOT the zod schemas. The forms are client components, and
 * importing a schema module into one pulls zod into the browser bundle: doing
 * that added ~74 KB to the first load of every product page, which on a
 * comparison site is the page that matters most. `lib/server/validation.ts`
 * builds its zod schemas from these same constants, so the server still gets
 * proper parsing and the browser ships a few hundred bytes of comparisons.
 *
 * The server re-validates everything regardless. The client copy saves a round
 * trip; it is not the gate.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 80;

export const EMAIL_MAX = 200;

export const PASSWORD_MIN = 8;
/**
 * Not a strength rule — a denial-of-service one. scrypt's cost grows with input
 * length, so an unbounded password field in front of it lets one request burn
 * arbitrary CPU.
 */
export const PASSWORD_MAX = 200;

export const REVIEW_TITLE_MIN = 3;
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_COMMENT_MIN = 20;
export const REVIEW_COMMENT_MAX = 4000;

export const MESSAGES = {
  nameShort: "Enter your name.",
  nameLong: "That name is too long.",
  emailInvalid: "That does not look like an email address.",
  emailLong: "That email address is too long.",
  passwordShort: `Use at least ${PASSWORD_MIN} characters.`,
  passwordLong: "That password is too long.",
  titleShort: "Give it a short title.",
  titleLong: "That title is too long.",
  commentShort: `Tell us a little more — at least ${REVIEW_COMMENT_MIN} characters.`,
  commentLong: "That review is too long.",
  ratingRange: "Pick a rating from 1 to 5.",
} as const;

/**
 * Good enough to catch a typo before a round trip, and deliberately no stricter.
 *
 * A regex cannot decide whether an address is deliverable, and the elaborate
 * ones reject valid addresses — apostrophes, new TLDs, long subdomains. The
 * server's parser is the real check; this is here to catch "jai@gmail" while
 * someone is still looking at the field.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Each returns an error message, or null when the value is acceptable. */

export function checkName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < NAME_MIN) return MESSAGES.nameShort;
  if (trimmed.length > NAME_MAX) return MESSAGES.nameLong;
  return null;
}

export function checkEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length > EMAIL_MAX) return MESSAGES.emailLong;
  if (!EMAIL_PATTERN.test(trimmed)) return MESSAGES.emailInvalid;
  return null;
}

export function checkPassword(value: string): string | null {
  // Not trimmed: a leading or trailing space is part of a password.
  if (value.length < PASSWORD_MIN) return MESSAGES.passwordShort;
  if (value.length > PASSWORD_MAX) return MESSAGES.passwordLong;
  return null;
}

export function checkReviewTitle(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < REVIEW_TITLE_MIN) return MESSAGES.titleShort;
  if (trimmed.length > REVIEW_TITLE_MAX) return MESSAGES.titleLong;
  return null;
}

export function checkReviewComment(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < REVIEW_COMMENT_MIN) return MESSAGES.commentShort;
  if (trimmed.length > REVIEW_COMMENT_MAX) return MESSAGES.commentLong;
  return null;
}

export function checkRating(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) return MESSAGES.ratingRange;
  return null;
}
