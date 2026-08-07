"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getLaptopById } from "@/lib/data/laptops";

export const COMPARE_STORAGE_KEY = "lunowix:compare";
export const COMPARE_HISTORY_KEY = "lunowix:compare-history";

/** The comparison table is designed for two columns side by side. */
export const MAX_COMPARE = 2;

export function useCompare() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(COMPARE_STORAGE_KEY, []);
  const [history, setHistory] = useLocalStorage<string[][]>(COMPARE_HISTORY_KEY, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const isFull = ids.length >= MAX_COMPARE;

  const setSlot = useCallback(
    (index: number, id: string | null) =>
      setIds((prev) => {
        const next = [...prev];
        if (id === null) next.splice(index, 1);
        else next[index] = id;
        return next.filter(Boolean).slice(0, MAX_COMPARE);
      }),
    [setIds],
  );

  const remove = useCallback(
    (id: string) => setIds((prev) => prev.filter((item) => item !== id)),
    [setIds],
  );

  /**
   * Adding past the two-slot limit replaces the oldest entry rather than
   * silently failing — that matches what people expect from a compare tray.
   */
  const add = useCallback(
    (id: string) =>
      setIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id].slice(-MAX_COMPARE);
      }),
    [setIds],
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

  const laptops = useMemo(
    () => ids.map(getLaptopById).filter((laptop) => laptop !== undefined),
    [ids],
  );

  const historyLaptops = useMemo(
    () =>
      history
        .map((pair) => pair.map(getLaptopById).filter((laptop) => laptop !== undefined))
        .filter((pair) => pair.length === 2),
    [history],
  );

  return {
    ids,
    laptops,
    count: ids.length,
    isFull,
    has,
    add,
    remove,
    toggle,
    setSlot,
    clear,
    hydrated,
    history: historyLaptops,
    recordHistory,
  };
}
