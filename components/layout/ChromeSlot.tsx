"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Drops site chrome on the routes listed in `hiddenOn`.
 *
 * The footer is 432px tall. On a 900px viewport that leaves 402px for a
 * sign-in form which is 478px on its own, so an auth page could not fill the
 * viewport without scrolling no matter how tightly it was laid out — the
 * scrollbar was structural, not a spacing mistake. Auth routes conventionally
 * drop the marketing footer anyway; this is how.
 *
 * It takes the footer as CHILDREN rather than importing it. That keeps the
 * server component a server component: it is rendered on the server and passed
 * through, so none of the footer's data imports — the product catalogue, the
 * budget bands — are pulled into the client bundle by this file.
 */
export function ChromeSlot({
  hiddenOn,
  children,
}: {
  hiddenOn: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (hiddenOn.some((prefix) => pathname.startsWith(prefix))) return null;
  return <>{children}</>;
}
