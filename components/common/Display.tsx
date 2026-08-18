/*
 * Re-exports. NOTHING IS IMPLEMENTED HERE — see the note in `lib/hooks/index.ts`.
 *
 * This was a THIRD copy of the shared controls, beside the per-component files
 * and `index.tsx`: its own `Badge`, `Rating`, `Breadcrumb`, `EmptyState`,
 * skeletons, `Logo`, `ReviewCard`, `SectionHeading` and social icons. Several
 * live routes import from here — `/phones`, `/headphones`, `/products` and the
 * home and detail sections — so the path is kept, pointed at the one
 * implementation of each control.
 */

export * from "./Badge";
export * from "./Breadcrumb";
export * from "./EmptyState";
export * from "./LoadingSkeleton";
export * from "./Logo";
export * from "./Rating";
export * from "./ReviewCard";
export * from "./SectionHeading";
export * from "./SocialIcons";
export * from "./buttonStyles";
