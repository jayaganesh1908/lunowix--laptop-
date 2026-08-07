"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

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
