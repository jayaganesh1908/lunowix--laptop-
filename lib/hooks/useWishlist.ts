"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getProductsByIds } from "@/lib/data/products";
import { type Laptop } from "@/lib/types";

export const WISHLIST_STORAGE_KEY = "lunowix:wishlist";

export function useWishlist() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(WISHLIST_STORAGE_KEY, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const add = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setIds],
  );

  const remove = useCallback(
    (id: string) => setIds((prev) => prev.filter((item) => item !== id)),
    [setIds],
  );

  /** Returns the state *after* the toggle so callers can word their toast. */
  const toggle = useCallback(
    (id: string) => {
      const next = !ids.includes(id);
      setIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
      return next;
    },
    [ids, setIds],
  );

  const clear = useCallback(() => setIds([]), [setIds]);

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

  return { ids, products, laptops, count: ids.length, has, add, remove, toggle, clear, hydrated };
}
