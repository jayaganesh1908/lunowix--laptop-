"use client";

import * as React from "react";
import { useState } from "react";
import { LunowixMark } from "@/components/common/LunowixMark";
import { cn } from "@/lib/utils/cn";

/*
 * Upstream ships this with a `:root` block defining `--color-bg: #101214` and
 * friends. That block is NOT imported here, for two reasons:
 *
 *  1. It sets DARK values on `:root`, so light mode would render dark.
 *  2. It is a cold blue-grey scheme, and this project runs a warm
 *     cream/brown/orange palette. Dropping it in would override the surface
 *     ladder in `globals.css` app-wide, not just on this component.
 *
 * Every `var(--color-*)` is mapped onto an existing token instead, so the
 * component is theme-aware through the same system as the rest of the app:
 *
 *   --color-bg           -> ink-50    / ink-850   (page)
 *   --color-surface      -> white/80  / ink-950   (input well)
 *   --color-border       -> ink-200   / white/15
 *   --color-text-primary -> brand-500              (the cursor highlight)
 *   --color-bg-2         -> ink-100   / ink-900   (social chip)
 */

export interface AppInputProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string;
  icon?: React.ReactNode;
}

/**
 * Text input with a highlight that tracks the cursor along its top and bottom
 * edges.
 *
 * The highlight is drawn with `radial-gradient` on two 2px strips rather than
 * on a border, because a border cannot be partially lit — the gradient needs
 * somewhere to fall off.
 */
export function AppInput({ label, icon, className, id, ...rest }: AppInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const [x, setX] = useState(0);
  const [hovering, setHovering] = useState(false);

  const onMouseMove = (event: React.MouseEvent<HTMLInputElement>) => {
    setX(event.clientX - event.currentTarget.getBoundingClientRect().left);
  };

  // `var(--color-brand-500)` rather than a literal: `.dark` re-points it, so
  // the highlight follows the theme's own accent with no second value here.
  const edge = `radial-gradient(30px circle at ${x}px 1px, var(--color-brand-500) 0%, transparent 70%)`;

  return (
    <div className="relative w-full min-w-[200px]">
      {label ? (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
          {label}
        </label>
      ) : null}

      <div className="relative w-full">
        <input
          id={inputId}
          onMouseMove={onMouseMove}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={cn(
            "peer relative z-10 h-13 w-full rounded-xl border border-ink-200 bg-white/80 px-4 text-sm",
            "outline-none transition placeholder:text-ink-400",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
            "dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500",
            icon && "pr-11",
            className,
          )}
          {...rest}
        />

        {hovering ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] rounded-t-xl"
              style={{ background: edge }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] rounded-b-xl"
              style={{ background: edge }}
            />
          </>
        ) : null}

        {icon ? (
          <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2 text-ink-500 dark:text-ink-400">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The cursor-tracking edge on its own, for fields that already have their own
 * markup and cannot be swapped for `AppInput`.
 *
 * Drop it inside an existing `relative` container alongside the input. It
 * renders the two lit strips and the handlers needed to drive them; spread
 * `handlers` onto whatever element should be tracked.
 */
export function useCursorEdge(radius = 30) {
  const [x, setX] = useState(0);
  const [hovering, setHovering] = useState(false);

  const handlers = {
    onMouseMove: (event: React.MouseEvent<HTMLElement>) =>
      setX(event.clientX - event.currentTarget.getBoundingClientRect().left),
    onMouseEnter: () => setHovering(true),
    onMouseLeave: () => setHovering(false),
  };

  const background = `radial-gradient(${radius}px circle at ${x}px 1px, var(--color-brand-500) 0%, transparent 70%)`;

  const edges = hovering ? (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] rounded-t-xl"
        style={{ background }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] rounded-b-xl"
        style={{ background }}
      />
    </>
  ) : null;

  return { handlers, edges };
}

export interface SpotlightPanelProps {
  children: React.ReactNode;
  /** Diameter of the bloom in px. */
  size?: number;
  /** Peak opacity, 0-1. The two knobs are separate: size spreads the light,
   *  opacity raises its intensity at the cursor. */
  intensity?: number;
  className?: string;
}

/**
 * A panel with a soft brand spotlight that follows the cursor.
 *
 * Upstream uses a purple/blue/pink gradient blob. That reads as a different
 * product against this palette, so it is a single brand-tinted bloom instead.
 */
export function SpotlightPanel({
  children,
  size = 560,
  intensity = 0.55,
  className,
}: SpotlightPanelProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn("relative overflow-hidden", className)}
    >
      {/*
        A radial gradient, not a flat-filled circle behind `blur-3xl`.
        A blurred solid disc has a broad even core and only softens at its rim,
        so raising its opacity brightens the whole panel rather than the point
        under the cursor. A gradient falls off from the centre, so intensity
        reads as "brighter where the cursor is" — which is the thing that
        should get stronger as you move.

        `--color-brand-500` re-points under `.dark`, so this tracks the theme
        accent with no second colour here.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full blur-2xl transition-opacity duration-200"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-brand-500) 85%, transparent) 0%, " +
            "color-mix(in oklab, var(--color-brand-500) 35%, transparent) 45%, transparent 70%)",
          opacity: hovering ? intensity : 0,
          transform: `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`,
          transition: "transform 0.08s ease-out, opacity 200ms",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export interface AuthSplitCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Split card: form on the left under a cursor spotlight, brand lockup on the
 * right.
 *
 * The right half held a product photo, full-bleed at 30-40% opacity, which is
 * the right treatment for a photo used as texture and the wrong one for a logo.
 * A logo needs its own margin and its real contrast — faded and cropped to a
 * panel it reads as a watermark someone forgot to remove. So it is centred at a
 * fixed measure with generous padding, and left opaque.
 *
 * `LunowixMark` ships light and dark files and swaps them in CSS, so nothing
 * here has to know the theme.
 */
export function AuthSplitCard({ children, className }: AuthSplitCardProps) {
  return (
    <div className={cn("card-surface flex overflow-hidden", className)}>
      <SpotlightPanel className="w-full lg:w-1/2">
        <div className="p-6 sm:p-8">{children}</div>
      </SpotlightPanel>

      {/* Border rather than the old gradient: with a photo the two halves met
          in a hard seam that needed softening, but the panel now shares the
          card's own surface, so a hairline is all the division it needs. */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-ink-200 p-10 dark:border-white/10 lg:flex">
        {/* Sits behind the lockup and echoes the resting card bloom, so the
            panel is not a flat void next to an interactive form. */}
        <div
          aria-hidden
          className="pointer-events-none absolute size-72 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15"
        />
        <LunowixMark lockup className="relative w-full max-w-[260px]" />
      </div>
    </div>
  );
}
