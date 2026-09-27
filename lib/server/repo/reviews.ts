import "server-only";

import { randomUUID } from "node:crypto";
import { getStore } from "../store";
import { type Doc } from "../store/types";
import { type Review } from "@/lib/types";

/**
 * Reviews people actually wrote.
 *
 * These live ALONGSIDE the generated demo reviews in `lib/data`, they do not
 * replace them: the catalogue's three-per-product samples are what keeps the
 * detail pages statically pre-renderable and non-empty on a fresh install.
 * `/api/reviews/[productId]` returns only the stored ones, and the detail page
 * shows them above the samples with the real count.
 */

export interface StoredReview extends Doc {
  id: string;
  productId: string;
  userId: string;
  /** Denormalised so rendering a review does not need a users lookup per row. */
  author: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

/** The shape the existing `ReviewCard` already renders. */
export function toReview(stored: StoredReview): Review {
  return {
    id: stored.id,
    author: stored.author,
    rating: stored.rating,
    title: stored.title,
    comment: stored.comment,
    date: stored.createdAt.slice(0, 10),
    /*
     * Every stored review is from a signed-in account, which is exactly what
     * this flag is claiming. The generated samples set it arbitrarily.
     */
    verified: true,
  };
}

export async function listReviews(productId: string): Promise<StoredReview[]> {
  const rows = await getStore().find<StoredReview>("reviews", { productId });
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findUserReview(
  productId: string,
  userId: string,
): Promise<StoredReview | null> {
  return getStore().findOne<StoredReview>("reviews", { productId, userId });
}

export interface SubmitReviewInput {
  productId: string;
  userId: string;
  author: string;
  rating: number;
  title: string;
  comment: string;
}

/**
 * One review per person per product; a second submission edits the first.
 *
 * Rejecting it instead would leave someone who spotted a typo with no way to
 * fix it, and allowing many would let one account tilt a product's average on
 * its own.
 */
export async function submitReview(input: SubmitReviewInput): Promise<StoredReview> {
  const existing = await findUserReview(input.productId, input.userId);
  const now = new Date().toISOString();

  const review: StoredReview = {
    id: existing?.id ?? randomUUID(),
    productId: input.productId,
    userId: input.userId,
    author: input.author,
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await getStore().put("reviews", review);
  return review;
}

/** Deletes a review, but only for its own author. */
export async function deleteReview(id: string, userId: string): Promise<boolean> {
  const store = getStore();
  const review = await store.get<StoredReview>("reviews", id);
  if (!review || review.userId !== userId) return false;
  return store.delete("reviews", id);
}

export interface ReviewSummary {
  count: number;
  /** Mean rating to one decimal, or null when nobody has reviewed it. */
  average: number | null;
}

export async function summarise(productId: string): Promise<ReviewSummary> {
  const rows = await listReviews(productId);
  if (rows.length === 0) return { count: 0, average: null };

  const total = rows.reduce((sum, row) => sum + row.rating, 0);
  return { count: rows.length, average: Math.round((total / rows.length) * 10) / 10 };
}

export async function countReviews(): Promise<number> {
  return getStore().count("reviews");
}

export async function recentReviews(limit = 5): Promise<StoredReview[]> {
  const rows = await getStore().find<StoredReview>("reviews");
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
