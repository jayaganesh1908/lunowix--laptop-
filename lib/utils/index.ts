/*
 * Re-exports. NOTHING IS IMPLEMENTED HERE — see the note in `lib/hooks/index.ts`.
 *
 * This file used to hold a second, complete copy of four sibling modules: every
 * formatter from `./formatters`, every variant from `./animations`, `cn` from
 * `./cn` and all four helpers from `./filterParams`. Both copies were live —
 * some files import `@/lib/utils`, others `@/lib/utils/formatters` — so the app
 * was running two implementations of the same sixteen functions and whichever
 * one a file got depended on how it had written its import.
 *
 * It had already caused a visible bug. `formatCompact` used `Intl.NumberFormat`
 * with `notation: "compact"`, and Node's ICU and Chromium's disagree on `en-IN`:
 * the server rendered 8,616 reviews as "8.6K" and the browser as "8.6T", so
 * React failed hydration on /admin and threw away the subtree. Fixing that meant
 * fixing it twice, which is exactly the trap this pattern sets.
 */

export * from "./animations";
export * from "./cn";
export * from "./filterParams";
export * from "./formatters";
