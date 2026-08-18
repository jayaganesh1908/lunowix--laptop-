"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { LogIn } from "lucide-react";
import { useMagnetField } from "@/components/ui/magnetize-button";
import { cn } from "@/lib/utils";

/*
 * The login CTA, shaped like the one product this whole site is about: a
 * laptop, with the word on its screen.
 *
 * The lid IS the anchor. It would have been easier to draw a laptop and put a
 * link on top of it, but then the clickable area and the thing that looks
 * clickable are two different boxes. Here the screen face is the link's own
 * face, and the only decorative parts — the deck it stands on and the lip below
 * that — sit outside it, `aria-hidden`, adding nothing to the accessible name.
 *
 * The screen keeps the brand gradient the old button had, so this reads as the
 * same CTA at a glance and holds the same contrast: ink-950 on brand-400/500 is
 * 8.2:1 and 6.9:1, where white on brand would be 2.6:1. See `buttonStyles`.
 *
 * Sizes are fixed pixels rather than percentages. A shrink-to-fit column
 * resolves percentage widths against a container width that those same children
 * are supposed to determine, so a `w-[116%]` deck would collapse to nothing.
 */

/*
 * The machine is the NEGATIVE of the surface it stands on, not a match for it.
 * A silver laptop on the light page and a graphite one on the dark page each
 * vanish into their own background — the chassis has to invert with the theme
 * even though the screen does not.
 *
 *   light page → dark walnut chassis   (like the dark outline in the reference)
 *   dark page  → warm brushed chassis
 *
 * Both are mixed from the ink ramp, not from neutral greys. The palette warms
 * toward both ends — page `ink-50` is cream #F5F1DE and `ink-850` is brown
 * #2F2519 — so a blue-grey aluminium sits on this site as a cold patch no
 * matter how well it contrasts. The stops below are `ink-800/850/900` for the
 * dark chassis and cream steps drawn between `ink-50` and `ink-300` for the
 * light one; literals rather than `var()`, because these rules are already
 * split by theme and the ink vars re-point under `.dark`.
 *
 * The screen stays brand orange in both: it is a display that is switched on,
 * and it carries enough contrast against either chassis.
 */
const LAPTOP_CSS = `
.lpb-lid {
  background: linear-gradient(165deg, #4a3f35 0%, #2f2519 55%, #1f1810 100%);
  border: 1px solid rgba(18,13,8,0.6);
  box-shadow:
    inset 0 1px 0 rgba(255,222,185,0.22),
    0 6px 16px -9px rgba(31,24,16,0.75);
}
.dark .lpb-lid {
  background: linear-gradient(165deg, #f2ebde 0%, #dbd2c3 55%, #bfb5a4 100%);
  border-color: rgba(255,238,209,0.4);
  box-shadow:
    inset 0 1px 0 rgba(255,252,244,0.95),
    0 8px 18px -9px rgba(0,0,0,0.85);
}

/* The panel: brand fill, a shallow reflection, and a dark rim so the screen
   reads as glass set into the frame rather than as paint on it. */
.lpb-screen {
  background:
    linear-gradient(118deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 24%, transparent 34%),
    linear-gradient(90deg, var(--color-brand-400) 0%, var(--color-brand-500) 100%);
  box-shadow: inset 0 0 0 1px rgba(80,32,0,0.28), inset 0 1px 0 rgba(255,255,255,0.3);
}
.lpb-lid:hover .lpb-screen, .lpb-lid:focus-visible .lpb-screen {
  background:
    linear-gradient(118deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 24%, transparent 34%),
    linear-gradient(90deg, var(--color-brand-300) 0%, var(--color-brand-400) 100%);
}

.lpb-deck {
  background: linear-gradient(180deg, #574a3e 0%, #3a2f22 52%, #241b12 100%);
  box-shadow: inset 0 1px 0 rgba(255,222,185,0.24), 0 6px 12px -7px rgba(31,24,16,0.8);
}
.dark .lpb-deck {
  background: linear-gradient(180deg, #ece4d6 0%, #d2c9b9 52%, #b0a695 100%);
  box-shadow: inset 0 1px 0 rgba(255,252,244,0.95), 0 8px 14px -7px rgba(0,0,0,0.9);
}

.lpb-notch { background: rgba(10,7,4,0.6); }
.dark .lpb-notch { background: rgba(47,37,25,0.42); }
`;

export type LaptopLoginLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "className" | "children"
> & {
  label?: string;
  particleCount?: number;
  attractRadius?: number;
  /** Classes for the wrapper — layout and responsive visibility go here. */
  containerClassName?: string;
};

export function LaptopLoginLink({
  label = "Login",
  particleCount = 24,
  attractRadius = 88,
  containerClassName,
  ...props
}: LaptopLoginLinkProps) {
  const { anchorRef, field, handlers } = useMagnetField(particleCount, attractRadius);

  return (
    <span
      ref={anchorRef}
      /* `inline-flex` is the default rather than an assumption about the
         caller; twMerge lets a caller's `hidden sm:inline-flex` replace it. */
      className={cn("relative inline-flex flex-col items-center", containerClassName)}
      {...handlers}
    >
      <style>{LAPTOP_CSS}</style>
      {field}

      {/* Brand bloom on the surface under the machine. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-2 bottom-0 z-0 h-3 rounded-[50%] bg-brand-500/45 blur-md"
      />

      {/* Lid — the link itself. */}
      {/*
        `aria-label` duplicates the visible text on purpose. The name would
        normally come from the contents, but the accessibility snapshot for this
        link came back nameless while every sibling reported its own — and it
        stayed nameless with the screen overlay pulled out of the subtree, so
        the overlay was not the cause and the reading was never explained. An
        explicit name costs nothing and cannot be computed away; it matches the
        visible label exactly, so voice control still works (WCAG 2.5.3).
      */}
      <Link
        {...props}
        aria-label={label}
        className="lpb-lid group/lpb relative z-10 flex h-9 w-[108px] items-center justify-center rounded-[8px] transition-transform duration-200 hover:-translate-y-px active:translate-y-0"
      >
        <span aria-hidden className="lpb-screen absolute inset-[3px] rounded-[5px]" />
        <span className="relative flex items-center gap-1.5 text-[13px] font-bold tracking-tight text-ink-950">
          <LogIn className="size-3.5" aria-hidden />
          {label}
        </span>
      </Link>

      {/* Deck, tapering out toward the viewer, with the finger notch. */}
      <span
        aria-hidden
        className="lpb-deck relative z-10 -mt-px block h-[7px] w-[126px] rounded-b-[5px]"
        style={{ clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" }}
      >
        <span className="lpb-notch absolute left-1/2 top-0 h-[3px] w-[15%] -translate-x-1/2 rounded-b-[3px]" />
      </span>
    </span>
  );
}

export { LaptopLoginLink as Component };
