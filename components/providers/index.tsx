/*
 * Re-exports. NOTHING IS IMPLEMENTED HERE — see the note in `lib/hooks/index.ts`.
 *
 * This file used to hold a second, independent copy of `ThemeProvider` and
 * `ToastProvider`, and the toast copy was actively broken in a way nothing
 * caught: it called `createContext()` again, producing a context object
 * distinct from the one in `ToastProvider.tsx`. `app/layout.tsx` mounts the
 * provider from `ToastProvider.tsx`, so `useToast` imported from THIS path
 * resolved against a context with no provider above it, hit the
 * "safe outside the provider" no-op fallback, and returned a `toast()` that
 * did nothing.
 *
 * `ProductCard` imports from here, so every wishlist and compare confirmation
 * on /phones, /headphones, /products, /search and the home featured row was
 * silently dropped — while `LaptopCard`, which imports from
 * `./ToastProvider` directly, showed its toast normally. Same bug class as the
 * navbar and compare-tray duplicates before it.
 */

export * from "./AppProviders";
export * from "./SessionProvider";
export * from "./ThemeProvider";
export * from "./ToastProvider";
