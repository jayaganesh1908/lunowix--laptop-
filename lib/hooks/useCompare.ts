"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getProductById } from "@/lib/data/products";

export const COMPARE_STORAGE_KEY = "lunowix:compare";
export const COMPARE_HISTORY_KEY = "lunowix:compare-history";

/** The comparison table is designed for two columns side by side. */
export const MAX_COMPARE = 2;

/*
 * Ids resolve against the CROSS-CATEGORY registry, not `getLaptopById`.
 *
 * They used to resolve against laptops only, while every product card on
 * /phones, /headphones and /products offered a compare button. Adding a phone
 * therefore incremented the nav counter, wrote the id to storage, and then
 * vanished on /compare — resolution returned `undefined` and the entry was
 * filtered away without a word. The wishlist had already been moved to the
 * shared registry; compare had not.
 *
 * A pair is also kept to ONE CATEGORY. Half the comparison table's rows are
 * category-specific — a phone has no GPU VRAM and a laptop has no optical zoom
 * — so a mixed pair would be a table of blanks. Adding across categories
 * switches the tray rather than mixing it.
 */
export function useCompare() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(COMPARE_STORAGE_KEY, []);
  const [history, setHistory] = useLocalStorage<string[][]>(COMPARE_HISTORY_KEY, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const isFull = ids.length >= MAX_COMPARE;

  /** Drops anything that is not the same kind of product as `id`. */
  const sameCategoryAs = useCallback((id: string, pool: string[]) => {
    const category = getProductById(id)?.category;
    return pool.filter((other) => getProductById(other)?.category === category);
  }, []);

  const setSlot = useCallback(
    (index: number, id: string | null) =>
      setIds((prev) => {
        const next = [...prev];
        if (id === null) next.splice(index, 1);
        else next[index] = id;
        const filled = next.filter(Boolean);
        const scoped = id === null ? filled : sameCategoryAs(id, filled);
        return scoped.slice(0, MAX_COMPARE);
      }),
    [setIds, sameCategoryAs],
  );

  const remove = useCallback(
    (id: string) => setIds((prev) => prev.filter((item) => item !== id)),
    [setIds],
  );

  /**
   * Adding past the two-slot limit replaces the oldest entry rather than
   * silently failing — that matches what people expect from a compare tray.
   * Adding a different kind of product empties the tray first, for the reason
   * in the note at the top of this file.
   */
  const add = useCallback(
    (id: string) =>
      setIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...sameCategoryAs(id, prev), id].slice(-MAX_COMPARE);
      }),
    [setIds, sameCategoryAs],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = !ids.includes(id);
      if (next) add(id);
      else remove(id);
      return next;
    },
    [ids, add, remove],
  );

  const clear = useCallback(() => setIds([]), [setIds]);

  const recordHistory = useCallback(
    (pair: string[]) => {
      if (pair.length < 2) return;
      setHistory((prev) => {
        const key = pair.join("|");
        const deduped = prev.filter((entry) => entry.join("|") !== key);
        return [pair, ...deduped].slice(0, 8);
      });
    },
    [setHistory],
  );

  /*
   * Sanitised on the way out, not just on the way in. `add` and `setSlot` keep
   * a tray to one category, but storage predates them: a browser that used the
   * site before this change can hold a laptop and a phone together, and a
   * mixed pair renders as two filled slots above a table that cannot draw
   * itself. Dropping the odd one out leaves the honest "pick a second" state.
   */
  const products = useMemo(() => {
    const resolved = ids.map(getProductById).filter((product) => product !== undefined);
    const category = resolved[0]?.category;
    return resolved.filter((product) => product.category === category);
  }, [ids]);

  const historyProducts = useMemo(
    () =>
      history
        .map((pair) => pair.map(getProductById).filter((product) => product !== undefined))
        .filter((pair) => pair.length === 2),
    [history],
  );

  /** What the tray is currently holding, or null while it is empty. */
  const category = products[0]?.category ?? null;

  return {
    ids,
    products,
    category,
    count: ids.length,
    isFull,
    has,
    add,
    remove,
    toggle,
    setSlot,
    clear,
    hydrated,
    history: historyProducts,
    recordHistory,
  };
}
