"use client";

import { useEffect, useState } from "react";
import { motion, type Transition, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const GLYPHS = "!<>-_\\/[]{}=+*^?#$%&01";

const FRAME_MS = 40;

/**
 * Scrambles `text` and resolves it left to right while `active`.
 *
 * Driven by `setInterval` rather than `requestAnimationFrame`: the effect is
 * deliberately choppy — a glyph swap every ~40ms reads as decryption, whereas
 * 60fps reads as noise.
 */
function useScramble(text: string, active: boolean, enabled: boolean) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!active || !enabled) {
      setDisplay(text);
      return;
    }

    // Each character gets its own resolve frame, staggered along the word.
    const resolveAt = Array.from(text, (_, i) => 3 + i * 2 + Math.floor(Math.random() * 4));
    const last = Math.max(...resolveAt);
    let frame = 0;

    const id = window.setInterval(() => {
      frame += 1;
      setDisplay(
        Array.from(text, (char, i) => {
          if (char === " ") return char;
          if (frame >= resolveAt[i]) return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }).join(""),
      );
      if (frame > last) window.clearInterval(id);
    }, FRAME_MS);

    return () => {
      window.clearInterval(id);
      setDisplay(text);
    };
  }, [active, enabled, text]);

  return display;
}

export interface DecryptSegment {
  text: string;
  /** Highlighted and interactive; plain prose otherwise. */
  decrypt?: boolean;
}

export interface DecryptTextProps {
  segments: DecryptSegment[];
  className?: string;
  /** Applied to the highlighted words in their resting state. */
  wordClassName?: string;
}

export function DecryptText({ segments, className, wordClassName }: DecryptTextProps) {
  const [active, setActive] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <span className={cn("relative inline", className)}>
      {segments.map((segment, index) =>
        segment.decrypt ? (
          <DecryptWord
            key={index}
            text={segment.text}
            active={active === index}
            dimmed={active !== null && active !== index}
            scrambleEnabled={!prefersReducedMotion}
            className={wordClassName}
            onActivate={() => setActive(index)}
            onDeactivate={() => setActive((current) => (current === index ? null : current))}
          />
        ) : (
          <span
            key={index}
            className={cn(
              "transition-[filter,opacity] duration-300",
              // Blur is applied per segment rather than to a shared ancestor:
              // a filter on the parent would blur the raised chip too.
              active !== null && "opacity-40 blur-[3px]",
            )}
          >
            {segment.text}
          </span>
        ),
      )}
    </span>
  );
}

interface DecryptWordProps {
  text: string;
  active: boolean;
  dimmed: boolean;
  scrambleEnabled: boolean;
  className?: string;
  onActivate: () => void;
  onDeactivate: () => void;
}

function DecryptWord({
  text,
  active,
  dimmed,
  scrambleEnabled,
  className,
  onActivate,
  onDeactivate,
}: DecryptWordProps) {
  const display = useScramble(text, active, scrambleEnabled);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
      tabIndex={0}
    >
      {/* The real word is the only copy of the text in the DOM — the scramble
          lives entirely in the aria-hidden chip below. Rendering a second
          `sr-only` copy would make the heading read "FindFind ... LaptopLaptop"
          to crawlers and anything reading textContent. While the chip is up
          this layer is only transparent, so it stays in the a11y tree. */}
      <span
        className={cn(
          "inline-block cursor-pointer transition-[filter,opacity] duration-300",
          "text-brand-600 dark:text-brand-400",
          dimmed && "opacity-40 blur-[3px]",
          active && "opacity-0",
          className,
        )}
      >
        {text}
      </span>

      {/* Raised chip. Absolutely positioned over the word so the surrounding
          line never reflows when it appears. */}
      {active ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
            "whitespace-nowrap rounded-xl border border-white/10 bg-ink-950 px-4 py-1.5",
            "font-mono text-brand-400 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.75)]",
          )}
        >
          {display}
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-brand-500" />
          <span className="absolute -bottom-1 -left-1 size-2 rounded-full bg-brand-300" />
        </span>
      ) : null}
    </span>
  );
}

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
