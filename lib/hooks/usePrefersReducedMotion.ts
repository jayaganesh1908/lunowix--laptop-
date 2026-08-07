"use client";

import { useEffect, useState } from "react";

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
