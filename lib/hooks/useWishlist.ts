"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { useSession } from "./useSession";
import { getProductsByIds } from "@/lib/data/products";
import { type Laptop } from "@/lib/types";

export const WISHLIST_STORAGE_KEY = "lunowix:wishlist";

/**
 * Saved products.
 *
 * localStorage is the RENDER source, always. A save shows instantly, and the
 * whole feature keeps working with no account — which is the point of the
 * signed-out experience and the reason the register page can honestly say the
 * wishlist already works.
 *
 * When there IS an account, each change is also sent to the server so it follows
 * the person to another device. That write is deliberately not awaited and its
 * failure does not roll the UI back: the local list is unchanged and correct,
 * and `SessionProvider` merges it into the account on the next sign-in. Undoing
 * a heart the visitor just clicked because a request lost a race is a worse
 * outcome than a save that syncs a moment later.
 */
export function useWishlist() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(WISHLIST_STORAGE_KEY, []);
  const { user } = useSession();

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  /** Mirrors one change to the account, when there is one. */
  const sync = useCallback(
    (productId: string, action: "add" | "remove") => {
      if (!user) return;
      void fetch("/api/wishlist", {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      }).catch(() => undefined);
    },
    [user],
  );

  const add = useCallback(
    (id: string) => {
      setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      sync(id, "add");
    },
    [setIds, sync],
  );

  const remove = useCallback(
    (id: string) => {
      setIds((prev) => prev.filter((item) => item !== id));
      sync(id, "remove");
    },
    [setIds, sync],
  );

  /** Returns the state *after* the toggle so callers can word their toast. */
  const toggle = useCallback(
    (id: string) => {
      const next = !ids.includes(id);
      setIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
      sync(id, next ? "add" : "remove");
      return next;
    },
    [ids, setIds, sync],
  );

  const clear = useCallback(() => {
    setIds([]);
    if (user) {
      // A bodiless DELETE clears the whole list server-side; see the route.
      void fetch("/api/wishlist", { method: "DELETE" }).catch(() => undefined);
    }
  }, [setIds, user]);

  /*
   * Resolved against the cross-category registry, not `getLaptopById`.
   *
   * Phone and headphone cards carry the same heart button, and they save
   * through `lib/hooks/index.ts`, whose copy of this hook already resolved
   * across every catalogue. This copy did not, and the wishlist page reads
   * THIS one — so a saved phone stayed in storage and counted in the nav badge
   * while the board rendered "Nothing saved yet".
   */
  const products = useMemo(() => getProductsByIds(ids), [ids]);

  /** Kept for the laptop-only surfaces that still expect this shape. */
  const laptops = useMemo(
    () => products.filter((product): product is Laptop => product.category === "laptop"),
    [products],
  );

  return {
    ids,
    products,
    laptops,
    count: ids.length,
    has,
    add,
    remove,
    toggle,
    clear,
    hydrated,
    /** True when changes are following the account rather than this browser only. */
    synced: Boolean(user),
  };
}
