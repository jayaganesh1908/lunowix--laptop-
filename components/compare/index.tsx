/*
 * Re-exports. NOTHING IS IMPLEMENTED HERE — see the note in `lib/hooks/index.ts`.
 *
 * The 600 lines that used to live in this file were a stale second copy of the
 * compare screen: its selector searched laptops only and its table rendered
 * laptop rows, so whichever page imported it got the old behaviour regardless
 * of what the real components did.
 */

export * from "./CompareWorkspace";
export * from "./ComparisonTable";
export * from "./ProductSelector";
