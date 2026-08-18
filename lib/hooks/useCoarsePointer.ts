"use client";

import { useEffect, useState } from "react";

const COARSE_QUERY = "(pointer: coarse)";

/**
 * True when the primary input is a finger rather than a mouse.
 *
 * Every effect on this site was built around hover — particles that converge on
 * pointer-enter, a bezel that heats where the cursor is, a stroke that redraws
 * when you point at it. On a touch screen there is no cursor and no hover, so
 * all of it was simply dead. Components use this to pick a trigger a thumb can
 * actually produce: entering the viewport, or being tapped.
 *
 * Deliberately NOT a width check. A 1280px touch laptop has no hover either,
 * and a 700px desktop window has one — the question is the input device, and
 * `pointer: coarse` is the only thing that actually asks it.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COARSE_QUERY);
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}
