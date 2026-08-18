"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, type Transition, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

const DRAW_EASE: Transition["ease"] = [0.43, 0.13, 0.23, 0.96];

export interface HandWrittenTitleProps {
  title?: string;
  subtitle?: string;
  /**
   * Rich title content, used instead of `title` when present — lets the caller
   * keep inline markup such as a gradient span inside the heading.
   */
  children?: React.ReactNode;
  /** Heading element to render. A page must only ever have one `h1`. */
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  /** Colour of the drawn circle; it inherits via `currentColor`. */
  strokeClassName?: string;
  /**
   * Re-draw the circle each time the pointer enters the title.
   *
   * The stroke used to draw once on mount and then sit there, which meant the
   * best thing on the page only ever played for people who happened to be
   * looking at the moment it loaded. Pointing at the heading runs it again.
   */
  redrawOnHover?: boolean;
  /**
   * Stretch the circle to the container instead of preserving its aspect ratio.
   *
   * The default only wraps the text when the box is close to the 1200x600
   * viewBox ratio — which the stock `py-24` happens to produce. Anywhere the
   * height is driven by content (a hero, a responsive heading) the circle
   * otherwise shrinks to fit and sits inside the words rather than around them.
   */
  stretch?: boolean;
}

function HandWrittenTitle({
  title = "Hand Written",
  subtitle,
  children,
  as = "h1",
  className,
  titleClassName,
  subtitleClassName,
  strokeClassName,
  redrawOnHover = true,
  stretch = false,
}: HandWrittenTitleProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  /*
   * The replay counter doubles as the path's `key`, so pointing at the title
   * remounts the stroke and it draws itself from nothing again.
   *
   * Remounting rather than driving imperative controls is deliberate: the mount
   * draw stays the plain declarative animation it always was, so if the pointer
   * handler never fires — a touch device, a hover that never happens — the
   * circle still draws exactly as before. An effect-driven version leaves the
   * stroke at zero length when its effect does not run, which is an invisible
   * hero on an untouched page.
   */
  const [runId, setRunId] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);

  const replay = () => {
    if (!redrawOnHover || prefersReducedMotion) return;
    setRunId((run) => run + 1);
  };

  /*
   * SCROLLING IT INTO VIEW COUNTS AS POINTING AT IT.
   *
   * The mount draw fires whether or not anyone is looking — on a phone the
   * hero is usually below the fold on first paint, so the one flourish on the
   * page played to nobody and could never be replayed, because there is no
   * hover to replay it with. Re-drawing on entry fixes both, and on a desktop
   * it means the stroke draws when you scroll back up to it as well.
   */
  const inView = useInView(hostRef, { amount: 0.55 });
  const wasInView = useRef(true); // the mount draw is the first play

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (inView && !wasInView.current) setRunId((run) => run + 1);
    wasInView.current = inView;
  }, [inView, prefersReducedMotion]);

  // With motion reduced, the stroke starts fully drawn instead of animating in.
  const draw: Variants = {
    hidden: {
      pathLength: prefersReducedMotion ? 1 : 0,
      opacity: prefersReducedMotion ? 1 : 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : {
            /* 2.5s on the first draw; replays are quicker, because a stroke
               that lags a second and a half behind the cursor reads as the
               page struggling rather than as a flourish. */
            pathLength: { duration: runId === 0 ? 2.5 : 1.4, ease: DRAW_EASE },
            opacity: { duration: 0.5 },
          },
    },
  };

  const fade = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.8 },
        };

  const Heading = motion[as];

  return (
    <div
      ref={hostRef}
      onPointerEnter={replay}
      className={cn("relative mx-auto w-full max-w-4xl py-24", className)}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 600"
          preserveAspectRatio={stretch ? "none" : undefined}
          className="h-full w-full"
          /* Purely decorative — the heading beside it carries the text. */
          aria-hidden="true"
          focusable="false"
        >
          <motion.path
            d="M 950 90
               C 1250 300, 1050 480, 600 520
               C 250 520, 150 480, 150 300
               C 150 120, 350 80, 600 80
               C 850 80, 950 180, 950 180"
            fill="none"
            strokeWidth="12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            key={runId}
            variants={draw}
            initial="hidden"
            animate="visible"
            className={cn("text-ink-900 opacity-90 dark:text-ink-50", strokeClassName)}
          />
        </motion.svg>
      </div>

      {/* Inset proportionally: the ellipse is widest at its vertical centre —
          exactly where the text sits — so content running the full container
          width gets cut by the stroke on narrow screens. */}
      <div className="relative z-10 flex flex-col items-center justify-center px-[8%] text-center">
        <Heading
          className={cn(
            "flex items-center gap-2 text-4xl tracking-tighter md:text-6xl",
            titleClassName,
          )}
          {...fade(0.5)}
        >
          {children ?? title}
        </Heading>

        {subtitle ? (
          <motion.p
            className={cn("text-xl text-ink-600 dark:text-ink-300", subtitleClassName)}
            {...fade(1)}
          >
            {subtitle}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}

export { HandWrittenTitle };
