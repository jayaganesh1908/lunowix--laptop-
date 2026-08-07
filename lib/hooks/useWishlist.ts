"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getLaptopById } from "@/lib/data/laptops";

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

  const laptops = useMemo(
    () => ids.map(getLaptopById).filter((laptop) => laptop !== undefined),
    [ids],
  );

  return { ids, laptops, count: ids.length, has, add, remove, toggle, clear, hydrated };
}
