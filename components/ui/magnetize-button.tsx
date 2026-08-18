"use client";

import Link from "next/link";
import { motion, useAnimation, useInView } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/common/buttonStyles";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/*
 * Magnetize: particles scattered around a control get pulled into it on hover,
 * and spring back out on leave.
 *
 * Five things differ from the upstream snippet, all forced by this codebase:
 *
 *  1. NO shadcn `Button`. This project is not a shadcn install — there is no
 *     `components.json`, no `cva`, no `@radix-ui/react-slot`, and the Tailwind
 *     v4 theme defines none of shadcn's tokens (`bg-primary`, `bg-background`,
 *     `ring-ring`). Pasting that Button in would compile every one of those
 *     classes to nothing and render a transparent, unstyled control. The
 *     project's own `buttonStyles()` carries the same job, so it is used here
 *     and the brand palette comes free.
 *
 *  2. Violet → brand orange, via `buttonStyles`.
 *
 *  3. Content is `children`, not a hardcoded magnet icon and a label that flips
 *     to "Attracting" on hover. A nav CTA has to keep saying "Login".
 *
 *  4. The field sits BEHIND the control, not inside it. Upstream's particles are
 *     children of the button, so they paint on top of its own fill — fine on a
 *     `violet-100` face, unreadable on a saturated orange gradient. Behind it,
 *     the particles are visibly swallowed by the button as they converge, which
 *     is the effect the name promises anyway.
 *
 *  5. `attractRadius` actually does something. Upstream accepts it and never
 *     reads it — the demo passes `attractRadius={50}` into a void. Here it is
 *     the scatter distance the particles are drawn in from.
 *
 * Also fixed on the way through: particles get `pointer-events-none` (loose
 * absolute divs up to 180px from the button would otherwise sit over whatever
 * is beside it and eat clicks), `aria-hidden`, and the resting positions are
 * clamped to the viewport — see `clampToViewport`.
 */

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * The field is wider than it is tall. These controls live in a 64px-high nav
 * bar, and a circular scatter would fling particles above the header and down
 * over the page beneath it.
 */
const SPREAD_RATIO_X = 1.6;
const SPREAD_RATIO_Y = 0.85;

/** Resting scale. They swell to full size as they are pulled in. */
const IDLE_SCALE = 0.5;

/**
 * A particle parked past the right edge of the window still counts toward the
 * document's scrollable width — even at `opacity: 0` — which raises a
 * horizontal scrollbar the moment this is used near the right edge of a nav
 * bar. Resting positions are therefore pinned inside the viewport.
 */
function clampToViewport(element: HTMLElement | null, x: number): number {
  if (!element) return x;
  const rect = element.getBoundingClientRect();
  const centre = rect.left + rect.width / 2;
  /*
   * `clientWidth`, NOT `innerWidth`: the latter counts the scrollbar gutter, so
   * clamping to it still let a particle land a few pixels into territory the
   * document cannot show — worth 2px of horizontal scrollbar on its own. The
   * margin also has to clear the widest particle's radius, since the clamp
   * positions centres and the element has width of its own.
   */
  const limit = document.documentElement.clientWidth;
  const margin = 16;
  return Math.min(Math.max(x, margin - centre), limit - margin - centre);
}

/**
 * Exported so a control that brings its own chrome — the laptop-shaped login
 * button, say — can wear the same particle field without inheriting
 * `buttonStyles`.
 */
export function useMagnetField(particleCount: number, attractRadius: number) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const coarsePointer = useCoarsePointer();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const controls = useAnimation();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAttracting, setIsAttracting] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setParticles([]);
      return;
    }

    /* Seeded on the client only, so there is no server/client HTML to disagree
       about — the first paint has no particles at all. */
    const seeds = Array.from({ length: particleCount }, (_, id) => ({
      id,
      x: (Math.random() * 2 - 1) * attractRadius * SPREAD_RATIO_X,
      y: (Math.random() * 2 - 1) * attractRadius * SPREAD_RATIO_Y,
      size: 6 + Math.random() * 6,
    }));

    const place = () =>
      setParticles(
        seeds.map((seed) => ({ ...seed, x: clampToViewport(anchorRef.current, seed.x) })),
      );

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [particleCount, attractRadius, prefersReducedMotion]);

  const attract = useCallback(() => {
    setIsAttracting(true);
    /* Not awaited, unlike upstream. Nothing follows the await, and an animation
       interrupted by a fast in-out sweep rejects — awaiting it only manufactures
       unhandled rejections. */
    void controls.start({
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 55, damping: 9 },
    });
  }, [controls]);

  const release = useCallback(() => {
    setIsAttracting(false);
    void controls.start((index: number) => {
      // Upstream indexes `particles[i]` unguarded, which throws on the render
      // before the seeding effect has run.
      const particle = particles[index];
      return {
        x: particle?.x ?? 0,
        y: particle?.y ?? 0,
        scale: IDLE_SCALE,
        transition: { type: "spring", stiffness: 100, damping: 15 },
      };
    });
  }, [controls, particles]);

  const field = useMemo(() => {
    if (particles.length === 0) return null;
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0 block">
        {particles.map((particle, index) => (
          <motion.span
            key={particle.id}
            custom={index}
            initial={{ x: particle.x, y: particle.y, scale: IDLE_SCALE }}
            animate={controls}
            className={cn(
              "absolute left-1/2 top-1/2 block rounded-full",
              "bg-brand-500 dark:bg-brand-400",
              /* Invisible at rest. Upstream leaves them at 40%, which reads as
                 stray debris when the control sits in a nav bar rather than
                 alone on a page. They fade in as they are drawn in. */
              "transition-opacity duration-300",
              isAttracting ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: particle.size,
              height: particle.size,
              marginLeft: -particle.size / 2,
              marginTop: -particle.size / 2,
              boxShadow: "0 0 14px 2px rgba(255,125,41,0.8), 0 0 4px rgba(255,180,120,0.9)",
            }}
          />
        ))}
      </span>
    );
  }, [particles, controls, isAttracting]);

  /*
   * ON TOUCH, ARRIVING ON SCREEN IS THE HOVER.
   *
   * A phone cannot hover, so the particles would only ever fire on the tap that
   * navigates away — the effect would exist and never be seen. Scrolling the
   * button into view plays it once instead, then lets it settle.
   */
  const inView = useInView(anchorRef, { amount: 0.9 });

  useEffect(() => {
    if (!coarsePointer || !inView || prefersReducedMotion) return;
    attract();
    const timer = window.setTimeout(release, 1500);
    return () => window.clearTimeout(timer);
  }, [coarsePointer, inView, prefersReducedMotion, attract, release]);

  /* Pointer events cover mouse and touch in one pair, so upstream's separate
     `onTouch*` handlers are unnecessary — as is its `touch-none`, which would
     block scrolling that starts on the control. Focus is included so the effect
     is not mouse-only. */
  const handlers = {
    onPointerEnter: attract,
    onPointerLeave: release,
    onPointerCancel: release,
    onFocus: attract,
    onBlur: release,
  };

  return { anchorRef, field, handlers, isAttracting };
}

interface MagnetizeOwnProps {
  particleCount?: number;
  /** Distance, in px, the particles are drawn in from. */
  attractRadius?: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Classes for the control itself. */
  className?: string;
  /** Classes for the wrapper — put layout and responsive visibility here. */
  containerClassName?: string;
  children: ReactNode;
}

export type MagnetizeLinkProps = MagnetizeOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

/**
 * The navigating form. A CTA that routes has to be an anchor: a `<button>`
 * breaks middle-click, open-in-new-tab and the browser's own link affordances,
 * and announces the wrong role.
 */
export function MagnetizeLink({
  particleCount = 12,
  attractRadius = 56,
  variant = "primary",
  size = "md",
  className,
  containerClassName,
  children,
  ...props
}: MagnetizeLinkProps) {
  const { anchorRef, field, handlers } = useMagnetField(particleCount, attractRadius);

  return (
    <span
      ref={anchorRef}
      className={cn("relative inline-flex", containerClassName)}
      {...handlers}
    >
      {field}
      <Link {...props} className={buttonStyles({ variant, size, className: cn("relative z-10", className) })}>
        {children}
      </Link>
    </span>
  );
}

export type MagnetizeButtonProps = MagnetizeOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function MagnetizeButton({
  particleCount = 12,
  attractRadius = 56,
  variant = "primary",
  size = "md",
  className,
  containerClassName,
  children,
  type,
  ...props
}: MagnetizeButtonProps) {
  const { anchorRef, field, handlers } = useMagnetField(particleCount, attractRadius);

  return (
    <span
      ref={anchorRef}
      className={cn("relative inline-flex", containerClassName)}
      {...handlers}
    >
      {field}
      <button
        {...props}
        type={type ?? "button"}
        className={buttonStyles({ variant, size, className: cn("relative z-10", className) })}
      >
        {children}
      </button>
    </span>
  );
}
