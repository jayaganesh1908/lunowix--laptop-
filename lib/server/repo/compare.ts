import "server-only";

import { randomUUID } from "node:crypto";
import { getStore } from "../store";
import { type Doc } from "../store/types";

/** Matches the client's `useCompare` cap, so a synced history looks the same. */
const MAX_HISTORY = 8;

export interface CompareRecord extends Doc {
  id: string;
  userId: string;
  /** Exactly two product ids, same category. Enforced at the route boundary. */
  pair: string[];
  createdAt: string;
}

export async function listCompareHistory(userId: string): Promise<string[][]> {
  const rows = await getStore().find<CompareRecord>("compareHistory", { userId });
  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_HISTORY)
    .map((row) => row.pair);
}

/**
 * Records a comparison, newest first, de-duplicated, capped.
 *
 * The key is order-insensitive: comparing A against B and then B against A is
 * the same comparison, and keeping both would fill the history with pairs that
 * look identical to the person reading it.
 */
export async function recordComparison(userId: string, pair: string[]): Promise<string[][]> {
  if (pair.length !== 2) return listCompareHistory(userId);

  const store = getStore();
  const key = [...pair].sort().join("|");
  const rows = await store.find<CompareRecord>("compareHistory", { userId });

  const duplicates = rows.filter((row) => [...row.pair].sort().join("|") === key);
  await Promise.all(duplicates.map((row) => store.delete("compareHistory", row.id)));

  await store.put<CompareRecord>("compareHistory", {
    id: randomUUID(),
    userId,
    pair,
    createdAt: new Date().toISOString(),
  });

  // Trim anything past the cap, oldest first.
  const remaining = (await store.find<CompareRecord>("compareHistory", { userId })).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  await Promise.all(
    remaining.slice(MAX_HISTORY).map((row) => store.delete("compareHistory", row.id)),
  );

  return listCompareHistory(userId);
}

export async function clearCompareHistory(userId: string): Promise<number> {
  return getStore().deleteWhere("compareHistory", { userId });
}

export async function countComparisons(): Promise<number> {
  return getStore().count("compareHistory");
}
