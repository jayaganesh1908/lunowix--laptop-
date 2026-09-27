import "server-only";

import { getStore } from "../store";
import { type Doc } from "../store/types";

/**
 * Product view counters.
 *
 * One row per product, id = the product id, so a view is a read-increment-write
 * of a single small document. `ProductBase.views` in the catalogue is a
 * hand-authored seed number for the admin "most viewed" ranking; these are the
 * real ones, and `lib/server/stats.ts` adds them on top of the seed rather than
 * replacing it, so the ranking does not reset to zero the day this ships.
 *
 * No per-visitor de-duplication. Counting "views" honestly would need a visitor
 * identity, which means either a tracking cookie or storing IP addresses, and
 * neither is worth it for a ranking on an internal dashboard. This counts detail
 * page hits, which is what it says.
 */

export interface ViewRecord extends Doc {
  id: string;
  count: number;
  lastViewedAt: string;
}

export async function recordView(productId: string): Promise<number> {
  const store = getStore();
  const existing = await store.get<ViewRecord>("views", productId);
  const count = (existing?.count ?? 0) + 1;

  await store.put<ViewRecord>("views", {
    id: productId,
    count,
    lastViewedAt: new Date().toISOString(),
  });

  return count;
}

export async function viewCounts(): Promise<Record<string, number>> {
  const rows = await getStore().find<ViewRecord>("views");
  return Object.fromEntries(rows.map((row) => [row.id, row.count]));
}

export async function totalViews(): Promise<number> {
  const rows = await getStore().find<ViewRecord>("views");
  return rows.reduce((sum, row) => sum + row.count, 0);
}
