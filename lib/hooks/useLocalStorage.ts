"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

/**
 * Every hook instance for a given key shares one subscriber set, so a wishlist
 * toggle on a card immediately re-renders the navbar badge without a context
 * provider. `storage` events keep other tabs in sync too.
 */
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, onChange: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(onChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    set?.delete(onChange);
    if (set && set.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private-mode or blocked storage — fall back to the initial value.
    return null;
  }
}

export type SetValue<T> = (value: T | ((previous: T) => T)) => void;

/**
 * `hydrated` is false during SSR and the hydration pass so callers can avoid
 * rendering storage-dependent markup that the server could not have produced.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, SetValue<T>, boolean] {
  const initialRef = useRef(initialValue);

  const subscribeToKey = useCallback(
    (onChange: () => void) => subscribe(key, onChange),
    [key],
  );

  // Returns the raw string; equal strings compare true, so React does not loop.
  const getSnapshot = useCallback(() => readRaw(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);

  const raw = useSyncExternalStore(subscribeToKey, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeToKey,
    () => true,
    () => false,
  );

  const value = useMemo(() => {
    if (raw === null) return initialRef.current;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialRef.current;
    }
  }, [raw]);

  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback<SetValue<T>>(
    (next) => {
      const resolved =
        typeof next === "function"
          ? (next as (previous: T) => T)(valueRef.current)
          : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Ignore quota / blocked-storage failures; state still updates below.
      }
      /*
       * Advance the ref NOW, not at the next render.
       *
       * `valueRef` is refreshed during render, so two writes in one tick both
       * resolved their updater against the pre-render value and the second
       * silently discarded the first. Seeding a shared comparison did exactly
       * that — `setSlot(0, a)` followed by `setSlot(1, b)` kept only `b`, and
       * a link with two products opened with one.
       */
      valueRef.current = resolved;
      notify(key);
    },
    [key],
  );

  return [value, setValue, hydrated];
}
