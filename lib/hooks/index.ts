"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getProductById } from "@/lib/data/products";
import type { Laptop } from "@/lib/types";

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
      notify(key);
    },
    [key],
  );

  return [value, setValue, hydrated];
}

/** Debounces a fast-changing value — used by the 300ms search inputs. */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Live `prefers-reduced-motion` state.
 *
 * The CSS block in `globals.css` covers CSS animations and transitions, but
 * Framer Motion and canvas loops run in JS and are untouched by it — they have
 * to opt out themselves.
 *
 * Starts `false` so the server and first client render agree; the real value
 * lands in the effect.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "lunowix:theme";

export interface ThemeContextValue {
  /** What the user picked. */
  mode: ThemeMode;
  /** What is actually painted, after resolving `system`. */
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light → dark → system. */
  toggleTheme: () => void;
  mounted: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}

/**
 * The side-by-side table is built around laptop specs — processor, graphics,
 * ports — so comparison is currently laptops-only, and the compare control is
 * not offered on phone or headphone cards. Resolving through the cross-category
 * registry and then narrowing means a stray id from an older build is dropped
 * rather than rendered as a half-empty column.
 */
const asLaptop = (id: string): Laptop | undefined => {
  const product = getProductById(id);
  return product?.category === "laptop" ? product : undefined;
};

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
    () => ids.map(asLaptop).filter((laptop) => laptop !== undefined),
    [ids],
  );

  const historyLaptops = useMemo(
    () =>
      history
        .map((pair) => pair.map(asLaptop).filter((laptop) => laptop !== undefined))
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

  /**
   * Resolved across every catalogue, not just laptops. A wishlist that silently
   * dropped a saved pair of headphones would look like data loss.
   */
  const products = useMemo(
    () => ids.map(getProductById).filter((product) => product !== undefined),
    [ids],
  );

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
  };
}
