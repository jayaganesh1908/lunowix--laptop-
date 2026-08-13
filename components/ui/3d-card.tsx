"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

const springConfig = { damping: 15, stiffness: 150 };

export interface UseTiltOptions {
  /** Maximum rotation at the card's corners, in degrees. */
  intensity?: number;
  /**
   * Perspective depth, applied via `transformPerspective` on the element
   * itself rather than needing a `perspective` ancestor — see `useTilt`.
   *
   * This, not `intensity`, is what governs how strong the effect looks, and it
   * has to be read relative to the card's width: the visible cue is the scale
   * difference between the near and far edge, which is roughly
   * `(width / 2) * sin(intensity) / perspective`. The upstream 1000px was
   * chosen for a 320px card shown on its own; at 1000px a 280px grid card
   * shifts ~3%, which reads as nothing at all. Keep perspective within ~2-3x
   * the card's width.
   */
  perspective?: number;
}

/**
 * Pointer-tracking 3D tilt, extracted from `InteractiveTravelCard` so any card
 * can take the effect without adopting that component's prop model.
 *
 * Returns `style` to spread onto a `motion.*` element plus the two pointer
 * handlers. Two deliberate choices:
 *
 *  - Perspective rides on the element via `transformPerspective` instead of a
 *    `perspective` wrapper div. A wrapper would sit between a stagger parent
 *    and its children and break Framer Motion's variant propagation, so every
 *    grid would silently lose its entrance animation.
 *  - Honours "reduce motion": tilt is a vestibular trigger, so the hook returns
 *    a flat, inert style and no-op handlers instead.
 */
export function useTilt({ intensity = 10.5, perspective = 700 }: UseTiltOptions = {}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(springY, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const { width, height, left, top } = event.currentTarget.getBoundingClientRect();
      mouseX.set((event.clientX - left) / width - 0.5);
      mouseY.set((event.clientY - top) / height - 0.5);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = React.useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  if (prefersReducedMotion) {
    return {
      style: { transformStyle: "preserve-3d" as const },
      onMouseMove: undefined,
      onMouseLeave: undefined,
    };
  }

  return {
    style: {
      rotateX,
      rotateY,
      transformPerspective: perspective,
      transformStyle: "preserve-3d" as const,
    },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}

type MotionArticleProps = React.ComponentProps<typeof motion.article>;

export interface TiltBoxProps extends Omit<MotionArticleProps, "children"> {
  /** Thickness of the box, in px. This is what separates a slab from a sheet. */
  depth?: number;
  intensity?: number;
  perspective?: number;
  /** Corner radius in px. Must match the front face's rounding — see below. */
  radius?: number;
  /** Classes for the front face: the visible card surface. */
  faceClassName?: string;
  /** Classes for the five hidden faces (back + four edges). */
  edgeClassName?: string;
  children: React.ReactNode;
}

/**
 * A card that tilts as a solid cuboid rather than a rotating sheet.
 *
 * A tilted flat element reads as paper no matter how much perspective it gets,
 * because there is nothing to see at its edges. This renders the five faces you
 * never look at straight on — back, left, right, top, bottom — so turning the
 * card reveals its thickness the way a boxed product would.
 *
 * Two constraints make or break it:
 *
 *  - The tilting element must NOT clip. `overflow: hidden` forces
 *    `transform-style: flat` (CSS Transforms 2, "grouping property"), which
 *    silently flattens every child back into the same plane. So the clipping
 *    lives on the front face instead, and the outer box stays unclipped.
 *  - The front face sits at z=0 and the body extends backward to z=-depth, so
 *    at rest the edges are exactly edge-on and project to zero width. The card
 *    looks untouched until you actually tilt it.
 *
 * Edge faces are inset by `radius` so the straight strips do not poke out past
 * the rounded corners of the front face.
 */
export const TiltBox = React.forwardRef<HTMLElement, TiltBoxProps>(
  (
    {
      depth = 22,
      intensity = 12,
      perspective = 650,
      radius = 16,
      faceClassName,
      edgeClassName,
      className,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const tilt = useTilt({ intensity, perspective });

    // Shared by all five: they are structural, never interactive or readable.
    // Deliberately DARKER than the front face in both themes — a lit object's
    // sides fall away from the light, and an edge lighter than the face reads
    // as a glowing rim rather than as thickness.
    const edge = cn(
      "pointer-events-none absolute bg-ink-200 dark:bg-ink-950",
      edgeClassName,
    );

    return (
      <motion.article
        ref={ref}
        {...rest}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        style={{ ...tilt.style, ...style }}
        className={cn("relative flex flex-col", className)}
      >
        {/* Back face — parallel to the front, pushed the full depth back. */}
        <div
          aria-hidden
          className={cn(edge, "inset-0")}
          style={{ transform: `translateZ(-${depth}px)`, borderRadius: radius }}
        />
        {/* Left/right edges: hinge on their own vertical edge and swing back. */}
        <div
          aria-hidden
          className={cn(edge, "left-0")}
          style={{
            top: radius,
            height: `calc(100% - ${radius * 2}px)`,
            width: depth,
            transformOrigin: "left center",
            transform: "rotateY(90deg)",
          }}
        />
        <div
          aria-hidden
          className={cn(edge, "right-0")}
          style={{
            top: radius,
            height: `calc(100% - ${radius * 2}px)`,
            width: depth,
            transformOrigin: "right center",
            transform: "rotateY(-90deg)",
          }}
        />
        {/* Top/bottom edges: same idea, hinged horizontally. */}
        <div
          aria-hidden
          className={cn(edge, "top-0")}
          style={{
            left: radius,
            width: `calc(100% - ${radius * 2}px)`,
            height: depth,
            transformOrigin: "center top",
            transform: "rotateX(-90deg)",
          }}
        />
        <div
          aria-hidden
          className={cn(edge, "bottom-0")}
          style={{
            left: radius,
            width: `calc(100% - ${radius * 2}px)`,
            height: depth,
            transformOrigin: "center bottom",
            transform: "rotateX(90deg)",
          }}
        />
        {/* Front face. Stays in flow so it defines the box's height, and owns
            the clipping the outer element cannot have. */}
        <div className={cn("relative flex flex-1 flex-col", faceClassName)}>
          {children}
        </div>
      </motion.article>
    );
  },
);
TiltBox.displayName = "TiltBox";

/**
 * Props for the InteractiveTravelCard component.
 */
export interface InteractiveTravelCardProps {
  /** The main title for the card, e.g., "Sapa Valley" */
  title: string;
  /** A subtitle or location, e.g., "Vietnam" */
  subtitle: string;
  /** The URL for the background image. */
  imageUrl: string;
  /** The text for the primary action button, e.g., "Book your trip" */
  actionText: string;
  /** The destination URL for the top-right link. */
  href: string;
  /** Callback function when the primary action button is clicked. */
  onActionClick: () => void;
  /** Optional additional class names for custom styling. */
  className?: string;
}

/**
 * A responsive and theme-adaptive card with a 3D tilt effect on hover.
 */
export const InteractiveTravelCard = React.forwardRef<
  HTMLDivElement,
  InteractiveTravelCardProps
>(
  (
    { title, subtitle, imageUrl, actionText, href, onActionClick, className },
    ref,
  ) => {
    const tilt = useTilt();

    return (
      <motion.div
        ref={ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        style={tilt.style}
        className={cn(
          // The upstream snippet uses shadcn's `border-border`; this project
          // has no shadcn token layer, so it maps onto the ink scale instead.
          "relative h-[26rem] w-80 rounded-2xl border border-ink-200/40 bg-transparent shadow-2xl dark:border-white/10",
          className,
        )}
      >
        <div
          style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
          className="absolute inset-4 grid h-[calc(100%-2rem)] w-[calc(100%-2rem)] grid-rows-[1fr_auto] rounded-xl shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- takes arbitrary
              external URLs, which next/image would need host allow-listing for. */}
          <img
            src={imageUrl}
            alt={`${title}, ${subtitle}`}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />

          {/* Darkening overlay for better text contrast over the image */}
          <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-black/20 via-transparent to-black/60" />

          <div className="relative flex flex-col justify-between rounded-xl p-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <motion.h2 style={{ transform: "translateZ(50px)" }} className="text-2xl font-bold">
                  {title}
                </motion.h2>
                <motion.p
                  style={{ transform: "translateZ(40px)" }}
                  className="text-sm font-light text-white/80"
                >
                  {subtitle}
                </motion.p>
              </div>
              <motion.a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, rotate: "2.5deg" }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Learn more about ${title}`}
                style={{ transform: "translateZ(60px)" }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowUpRight className="h-5 w-5 text-white" />
              </motion.a>
            </div>

            <motion.button
              onClick={onActionClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ transform: "translateZ(40px)" }}
              className={cn(
                "w-full rounded-lg py-3 text-center font-semibold text-white transition-colors",
                "bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-md hover:bg-white/20",
              )}
            >
              {actionText}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  },
);
InteractiveTravelCard.displayName = "InteractiveTravelCard";
