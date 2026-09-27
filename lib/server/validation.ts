import { z } from "zod";
import {
  EMAIL_MAX,
  MESSAGES,
  NAME_MAX,
  NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN,
  REVIEW_TITLE_MAX,
  REVIEW_TITLE_MIN,
} from "@/lib/validation/rules";

/**
 * The server's schemas, built from the shared constants in
 * `@/lib/validation/rules`.
 *
 * The bounds and the messages come from there so the browser's cheap pre-check
 * and this parser cannot disagree about what a valid password or review is. The
 * forms import the RULES, never this module: this one pulls in zod, and zod in a
 * client component added ~74 KB to the first load of every product page.
 *
 * This is the gate. The client copy only saves a round trip.
 */

export const emailSchema = z
  .string()
  .trim()
  .max(EMAIL_MAX, MESSAGES.emailLong)
  .pipe(z.email(MESSAGES.emailInvalid));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, MESSAGES.passwordShort)
  .max(PASSWORD_MAX, MESSAGES.passwordLong);

export const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, MESSAGES.nameShort)
  .max(NAME_MAX, MESSAGES.nameLong);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX),
  remember: z.boolean().optional().default(false),
});

/**
 * Product ids are slugs from the catalogue. Constrained to the slug alphabet so
 * a crafted id cannot travel any further into the store as a key.
 */
export const productIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "That is not a valid product id.");

export const wishlistMutationSchema = z.object({ productId: productIdSchema });

export const wishlistMergeSchema = z.object({
  /** Capped: this arrives from localStorage, which anyone can edit. */
  productIds: z.array(productIdSchema).max(200),
});

export const comparePairSchema = z.object({
  pair: z.tuple([productIdSchema, productIdSchema]),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, MESSAGES.ratingRange).max(5, MESSAGES.ratingRange),
  title: z
    .string()
    .trim()
    .min(REVIEW_TITLE_MIN, MESSAGES.titleShort)
    .max(REVIEW_TITLE_MAX, MESSAGES.titleLong),
  comment: z
    .string()
    .trim()
    .min(REVIEW_COMMENT_MIN, MESSAGES.commentShort)
    .max(REVIEW_COMMENT_MAX, MESSAGES.commentLong),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().trim().max(40).optional(),
});
