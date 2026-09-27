/*
 * Re-exports. NOTHING IS IMPLEMENTED HERE.
 *
 * This file used to carry a second, independent copy of every hook beside it,
 * and the two drifted the way two copies always do: `useCompare` here resolved
 * ids against the whole catalogue while the copy in `useCompare.ts` resolved
 * them against laptops only. Half the app imported one, half the other, and a
 * phone added to the compare tray from `/phones` vanished on `/compare` — the
 * card that added it and the page that read it were running different code.
 *
 * Keep it that way: a barrel re-exports, it does not implement. If you find
 * yourself writing a hook body in this file, you are about to recreate that
 * bug.
 */

export * from "./useCompare";
export * from "./useDebouncedValue";
export * from "./useLocalStorage";
export * from "./useSession";
export * from "./usePrefersReducedMotion";
export * from "./useTheme";
export * from "./useWishlist";
export * from "./useCoarsePointer";
