"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

export interface RotatingWordItem {
  word: string;
  href: string;
}

export interface RotatingWordLinkProps {
  /** Static text before the rotating word, e.g. "Explore". */
  prefix?: string;
  items: RotatingWordItem[];
  /** Milliseconds each word holds before the next one takes over. */
  interval?: number;
  className?: string;
  children?: React.ReactNode;
}

/* Letters fly up and out, the next word's letters arrive from below, both
   staggered — a slideshow per character rather than a crossfade of whole
   words. Exit runs in reverse so the word peels away from its end. */
const LETTERS = {
  hidden: { opacity: 0, y: "0.55em", rotateX: -75 },
  visible: { opacity: 1, y: "0em", rotateX: 0 },
  exit: { opacity: 0, y: "-0.55em", rotateX: 75 },
} as const;

const WORD = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
  exit: { transition: { staggerChildren: 0.022, staggerDirection: -1 } },
} as const;

/**
 * A link whose label cycles through several words, each animating letter by
 * letter — and whose destination follows whichever word is showing.
 *
 * Because the href changes under the cursor, two things are load-bearing:
 *
 *  - It PAUSES on hover and on keyboard focus. Without that you aim at
 *    "Headphones", the timer fires mid-click and you land on phones. Anything
 *    that rotates and navigates has to stop while it is being targeted.
 *  - It does not rotate at all under `prefers-reduced-motion`. WCAG 2.2.2 wants
 *    auto-updating content pausable, and a destination that changes on its own
 *    is worse for a user who cannot track the movement. They get the first item,
 *    fixed.
 *
 * The button RESIZES to each word rather than reserving the longest one's box,
 * so it hugs "Mobiles" and stretches for "Headphones". That is normally a click
 * hazard — a control that changes width under the pointer moves out from under
 * the cursor — but the pause above already removes it: the width can only
 * change while nothing is aiming at the button. The two behaviours have to stay
 * together; dropping the pause makes the resize dangerous again.
 */
export function RotatingWordLink({
  prefix,
  items,
  interval = 2400,
  className,
  children,
}: RotatingWordLinkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rotating = !prefersReducedMotion && items.length > 1;

  useEffect(() => {
    if (!rotating || paused) return;
    const id = window.setInterval(
      () => setIndex((value) => (value + 1) % items.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [rotating, paused, items.length, interval]);

  const current = items[rotating ? index : 0];

  /*
   * Every word is measured ONCE, up front, from a hidden rail.
   *
   * Measuring the current word from inside the animated box does not work: a
   * child there is constrained by the width being animated, so it reports the
   * box's width back instead of the word's. The measurement becomes circular
   * and the box settles one word behind — which shows up as the longest word
   * refusing to grow, since it inherits the previous, narrower value.
   *
   * The rail sits outside the animated element and each entry is absolutely
   * positioned, so every span shrink-wraps to its own text and nothing is
   * clamped by anything.
   */
  const railRef = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const next: Record<string, number> = {};
      rail.querySelectorAll<HTMLElement>("[data-word]").forEach((node) => {
        next[node.dataset.word as string] = node.getBoundingClientRect().width;
      });
      setWidths(next);
    };

    measure();
    // Webfonts land after first paint and change every metric, so re-measure
    // once they are ready rather than baking in fallback-font widths.
    document.fonts?.ready.then(measure).catch(() => {});
  }, [items]);

  const width = widths[current.word];

  return (
    <Link
      href={current.href}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // The visible label changes on a timer, so the accessible name is pinned
      // to the current destination rather than being assembled from animating
      // per-letter spans, which a screen reader would read as loose characters.
      aria-label={prefix ? `${prefix} ${current.word}` : current.word}
      // `relative` anchors the measurement rail below; the caller's button
      // styles do not set a positioning context.
      className={cn("relative", className)}
    >
      {prefix ? <span aria-hidden>{prefix}&nbsp;</span> : null}

      {/* The measurement rail — outside the animated box, never painted, never
          hit-tested. Each entry is absolute so it shrink-wraps to its own word. */}
      <span
        ref={railRef}
        aria-hidden
        className="pointer-events-none invisible absolute h-0 w-0 overflow-hidden"
      >
        {items.map((item) => (
          <span key={item.word} data-word={item.word} className="absolute whitespace-nowrap">
            {item.word}
          </span>
        ))}
      </span>

      {/*
        Width is a plain inline style with a CSS transition, NOT a Framer
        `animate`. Framer drives values on `requestAnimationFrame`, so where
        frames are throttled — a backgrounded tab, a non-compositing embed — the
        box keeps whatever width it was first given and every word after that is
        clipped or padded. A CSS transition degrades to an instant, correct jump
        instead, so the label is never wrong, only less smooth.

        `undefined` before the rail is read lets the letters below size the box
        naturally on first paint.
      */}
      <span
        aria-hidden
        style={{ width }}
        className="relative inline-flex overflow-hidden align-bottom transition-[width] duration-300 ease-out"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.word}
            variants={WORD}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex justify-start whitespace-nowrap"
            style={{ perspective: 400 }}
          >
            {current.word.split("").map((letter, position) => (
              <motion.span
                key={`${current.word}-${position}`}
                variants={LETTERS}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>

      {children}
    </Link>
  );
}
