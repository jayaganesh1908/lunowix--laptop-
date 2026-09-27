import "server-only";

import { getStore } from "../store";
import { type Doc } from "../store/types";
import { normaliseEmail } from "./users";

export interface SubscriberRecord extends Doc {
  id: string;
  email: string;
  createdAt: string;
  unsubscribedAt: string | null;
  /** Which page the sign-up came from, for a sense of what converts. */
  source: string;
}

/**
 * The address IS the id, lower-cased.
 *
 * That makes subscribing twice a no-op rather than a duplicate row, with no
 * uniqueness check to race against — and it means `unsubscribe` can find the
 * row without a scan.
 */
export async function subscribe(
  email: string,
  source = "home",
): Promise<{ created: boolean }> {
  const store = getStore();
  const id = normaliseEmail(email);

  const existing = await store.get<SubscriberRecord>("newsletter", id);
  if (existing && !existing.unsubscribedAt) return { created: false };

  await store.put<SubscriberRecord>("newsletter", {
    id,
    email: email.trim(),
    // Re-subscribing after unsubscribing keeps the original join date.
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    unsubscribedAt: null,
    source,
  });

  return { created: !existing };
}

/**
 * Marks an address unsubscribed rather than deleting it.
 *
 * A deleted row cannot answer "did this person ask not to be emailed?", so a
 * later import of an old list would mail them again.
 */
export async function unsubscribe(email: string): Promise<boolean> {
  const store = getStore();
  const record = await store.get<SubscriberRecord>("newsletter", normaliseEmail(email));
  if (!record || record.unsubscribedAt) return false;

  record.unsubscribedAt = new Date().toISOString();
  await store.put("newsletter", record);
  return true;
}

export async function countSubscribers(): Promise<number> {
  return getStore().count("newsletter", { unsubscribedAt: null });
}
