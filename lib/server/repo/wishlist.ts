import "server-only";

import { getStore } from "../store";
import { type Doc } from "../store/types";

/**
 * Saved products, one row per (user, product).
 *
 * A row each rather than an array on the user record, so two devices saving
 * different products at the same time cannot clobber each other — an array
 * would be read-modify-write and the later save would drop the earlier one.
 *
 * The id is derived, not random: `<userId>:<productId>`. That makes a duplicate
 * save an idempotent overwrite instead of a second row, with no read-then-check
 * in front of it.
 */

export interface WishlistRecord extends Doc {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

const rowId = (userId: string, productId: string) => `${userId}:${productId}`;

export async function listWishlist(userId: string): Promise<string[]> {
  const rows = await getStore().find<WishlistRecord>("wishlist", { userId });
  // Oldest first, so the board reads in the order things were saved.
  return rows
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((row) => row.productId);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const store = getStore();
  const id = rowId(userId, productId);
  // Keep the original timestamp so re-saving does not jump it to the end.
  const existing = await store.get<WishlistRecord>("wishlist", id);
  if (existing) return;

  await store.put<WishlistRecord>("wishlist", {
    id,
    userId,
    productId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<boolean> {
  return getStore().delete("wishlist", rowId(userId, productId));
}

export async function clearWishlist(userId: string): Promise<number> {
  return getStore().deleteWhere("wishlist", { userId });
}

/**
 * Folds a browser's saved ids into the account's, on sign-in.
 *
 * A UNION, never a replacement in either direction. Someone who saved three
 * products before signing in, on an account that already holds five, expects
 * eight — not three, and not five. Returns the merged list so the client can
 * adopt it as its own state in one round trip.
 */
export async function mergeWishlist(userId: string, localIds: string[]): Promise<string[]> {
  const existing = new Set(await listWishlist(userId));
  const additions = localIds.filter((id) => !existing.has(id));

  // Sequential, not Promise.all: the file store serialises writes per collection
  // anyway, and this keeps the created-at order matching the given order.
  for (const productId of additions) {
    await addToWishlist(userId, productId);
  }

  return listWishlist(userId);
}

export async function countWishlistRows(): Promise<number> {
  return getStore().count("wishlist");
}

export async function wishlistCountFor(userId: string): Promise<number> {
  return getStore().count("wishlist", { userId });
}
