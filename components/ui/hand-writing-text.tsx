"use client";

import { motion, type Transition, type Variants } from "framer-motion";
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
  stretch = false,
}: HandWrittenTitleProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

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
            pathLength: { duration: 2.5, ease: DRAW_EASE },
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
    <div className={cn("relative mx-auto w-full max-w-4xl py-24", className)}>
      <div className="pointer-events-none absolute inset-0">
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 600"
          preserveAspectRatio={stretch ? "none" : undefined}
          initial="hidden"
          animate="visible"
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
            variants={draw}
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
