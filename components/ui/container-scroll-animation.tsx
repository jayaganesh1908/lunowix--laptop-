"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  animate,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useMotionTemplate,
  useMotionValue,
  motion,
  type MotionValue,
} from "framer-motion";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/*
 * A card that lies back from the page and rises to meet you as you scroll.
 *
 * Seven things differ from the upstream snippet, all of them forced by this
 * codebase or by the component being used on a real page rather than a demo:
 *
 *  1. NO `any`. Upstream types `Header` as `({ translate, titleComponent }: any)`.
 *     This project extends `next/typescript`, where `no-explicit-any` is an
 *     error, so the build would fail on the paste. `Card` also declared a
 *     `translate` prop it never destructured; it is gone rather than ignored.
 *
 *  2. SCROLL OFFSET. Upstream leaves `useScroll` on its default range, which
 *     only completes when the container's end reaches the viewport's end — so
 *     its demo props the page open with `pt-[1000px] pb-[500px]` to make the
 *     animation reachable. Given an explicit offset the card finishes flattening
 *     as the section settles in view, and the section can be a normal height.
 *
 *  3. HEIGHT. `h-[60rem] md:h-[80rem]` is a screen and a half of nothing on a
 *     laptop; this sizes to its content with a floor instead.
 *
 *  4. COLOURS. The `#222222` shell, `#6C6C6C` border and `bg-gray-100
 *     dark:bg-zinc-900` screen are neutral greys, and this palette is warm at
 *     both ends. They come from the ink ramp now, so the bezel reads as the
 *     same material as everything else on the page.
 *
 *  5. GLOW. The bezel carries a brand rim that TIGHTENS AS THE CARD FLATTENS —
 *     dim and diffuse while the card is still lying back, hot and close once it
 *     is facing you. Built from `box-shadow` rather than a blurred element
 *     behind the card: a shadow follows the border radius and the 3D transform
 *     for free, and never paints over the content. A separate glow layer would
 *     need its own copy of the rotation to stay behind the card.
 *
 *  6. REDUCED MOTION. A scroll-driven rotation is exactly the kind of movement
 *     `prefers-reduced-motion` exists for. The card renders flat and still when
 *     it is set — and keeps the glow, since a static glow moves nothing.
 *
 *  7. `matchMedia` rather than a resize listener that re-runs `setState` on
 *     every resize frame.
 */

const MOBILE_QUERY = "(max-width: 768px)";

/** Depth under the card, in the palette's brown-black rather than pure black. */
const DEPTH_SHADOW =
  "0 9px 20px rgba(31,24,16,0.29), 0 37px 37px rgba(31,24,16,0.26), 0 84px 50px rgba(31,24,16,0.15), 0 149px 60px rgba(31,24,16,0.04)";

/** The glow at rest, for the reduced-motion and no-scroll cases. */
const STATIC_GLOW =
  "0 0 0 1px rgba(255,125,41,0.45), 0 0 44px -2px rgba(255,125,41,0.5), 0 0 160px -20px rgba(198,62,0,0.45)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export interface ContainerScrollProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  /** Degrees the card is laid back before it rises. */
  maxTilt?: number;
  className?: string;
}

export const ContainerScroll = ({
  titleComponent,
  children,
  maxTilt = 38,
  className,
}: ContainerScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const coarsePointer = useCoarsePointer();
  const inView = useInView(containerRef, { amount: 0.35 });

  /*
   * THE TILT HAS TO HAPPEN WHERE YOU CAN SEE IT.
   *
   * The first spelling of this ran from "section top enters the viewport" to
   * "section centre reaches screen centre", which sounds right and is not: the
   * whole rotation is spent while the card is still entering from the bottom
   * edge, so by the time it is comfortably in view it is already flat and the
   * animation appears not to happen at all.
   *
   * Starting at 0.9 of the viewport height means the card is a good way up the
   * screen — fully visible, still laid back — before it begins to rise, and it
   * finishes as its middle reaches the upper-middle of the screen.
   */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "center 0.4"],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [maxTilt, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.8, 0.95] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  /*
   * Three numbers drive the rim, all keyed to the same progress: the hairline
   * gains opacity, the near bloom draws in from 44px to 22px, and the far bloom
   * strengthens. The result reads as the card powering on as it turns to face
   * you rather than a lamp that is always on.
   */
  const rimAlpha = useTransform(scrollYProgress, [0, 1], [0.18, 0.55]);
  const nearBlur = useTransform(scrollYProgress, [0, 1], [70, 40]);
  const nearAlpha = useTransform(scrollYProgress, [0, 1], [0.22, 0.6]);
  const farAlpha = useTransform(scrollYProgress, [0, 1], [0.18, 0.5]);

  const glowShadow = useMotionTemplate`0 0 0 1px rgba(255,125,41,${rimAlpha}), 0 0 ${nearBlur}px -2px rgba(255,125,41,${nearAlpha}), 0 0 160px -20px rgba(198,62,0,${farAlpha}), ${DEPTH_SHADOW}`;

  /*
   * THE BEZEL HEATS WHERE YOU TOUCH IT.
   *
   * Not a glow that follows the cursor — a temperature. Three layers on the
   * same masked frame, each lagging further behind the pointer than the last:
   *
   *   core      white-hot, tight, exactly under the cursor — no lag
   *   glow      orange, wider, a spring behind it
   *   afterheat deep ember red, widest, a slower spring still
   *
   * The lag is the whole point. A single gradient pinned to the pointer reads
   * as a lamp being carried along the edge; three at different stiffnesses read
   * as metal taking heat and giving it up again, and the trail bends through
   * the corners on its own because a spring does not travel in straight lines.
   * `screen` blending lets the layers add up where they overlap instead of the
   * topmost one flatly winning.
   *
   * Coordinates come from `clientX/Y` minus the card's rect. The card is rotated
   * in 3D and a rect is the box's PROJECTION, so the mapping skews slightly
   * toward the receding edge; across gradients this soft it is not visible, and
   * inverting the transform matrix per pointer move buys nothing you can see.
   */
  const traceX = useMotionValue(-400);
  const traceY = useMotionValue(-400);
  const traceOpacity = useMotionValue(0);
  /** 0→1 walks the frame once; only used when there is no cursor to follow. */
  const sweep = useMotionValue(0);

  const glowX = useSpring(traceX, { stiffness: 190, damping: 26, mass: 0.6 });
  const glowY = useSpring(traceY, { stiffness: 190, damping: 26, mass: 0.6 });
  const heatX = useSpring(traceX, { stiffness: 55, damping: 22, mass: 1.1 });
  const heatY = useSpring(traceY, { stiffness: 55, damping: 22, mass: 1.1 });

  const trace = useMotionTemplate`
    radial-gradient(150px circle at ${traceX}px ${traceY}px, rgba(255,248,236,1), rgba(255,214,160,0.95) 38%, rgba(255,150,60,0) 72%),
    radial-gradient(420px circle at ${glowX}px ${glowY}px, rgba(255,150,60,0.9), rgba(255,110,20,0.5) 42%, rgba(255,110,20,0) 76%),
    radial-gradient(760px circle at ${heatX}px ${heatY}px, rgba(214,74,0,0.75), rgba(150,40,0,0.4) 46%, rgba(120,30,0,0) 80%)
  `;

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    traceX.set(event.clientX - rect.left);
    traceY.set(event.clientY - rect.top);
    traceOpacity.set(1);
  };

  const onPointerLeave = () => {
    // On touch the heat keeps running on its own, so lifting a finger must not
    // switch it off; on a mouse, leaving the card should.
    if (!coarsePointer) traceOpacity.set(0);
  };

  /*
   * TOUCH HAS NO CURSOR, SO THE HEAT WALKS THE FRAME ITSELF.
   *
   * On a phone there is nothing to follow: no hover, no pointer resting on the
   * bezel. Rather than leave the effect dead on the devices this site is mostly
   * read on, the heat travels the perimeter on a loop while the card is on
   * screen — same three lagging layers, same material, driven by a clock
   * instead of a hand.
   *
   * It runs only while the card is actually in view, so a phone is not burning
   * a spring animation on something scrolled past.
   */
  useEffect(() => {
    if (!coarsePointer || !inView || prefersReducedMotion) return;

    const card = cardRef.current;
    if (!card) return;

    traceOpacity.set(1);

    // A motion value, not an animated plain object: `animate(MotionValue,
    // number, …)` is the typed overload, and subscribing to it keeps the
    // per-frame work in one place.
    const stop = sweep.on("change", (t) => {
      const { width: w, height: h } = card.getBoundingClientRect();
      const p = t % 1;
      // Walk the four edges: top, right, bottom, left.
      if (p < 0.25) { traceX.set(p * 4 * w); traceY.set(0); }
      else if (p < 0.5) { traceX.set(w); traceY.set((p - 0.25) * 4 * h); }
      else if (p < 0.75) { traceX.set(w - (p - 0.5) * 4 * w); traceY.set(h); }
      else { traceX.set(0); traceY.set(h - (p - 0.75) * 4 * h); }
    });

    const controls = animate(sweep, 1, {
      duration: 5,
      ease: "linear",
      repeat: Infinity,
    });

    return () => {
      controls.stop();
      stop();
      sweep.set(0);
      traceOpacity.set(0);
    };
  }, [coarsePointer, inView, prefersReducedMotion, sweep, traceX, traceY, traceOpacity]);

  return (
    <div
      ref={containerRef}
      /* `overflow-x-clip`, never `-hidden`: `hidden` on one axis forces the
         other to `auto`, which would trap the page in its own scroll container.
         This is insurance behind the width cap above, not the mechanism. */
      className={cn(
        "relative flex items-center justify-center overflow-x-clip p-2 md:p-10",
        className,
      )}
    >
      <div className="relative w-full py-10 md:py-20" style={{ perspective: "800px" }}>
        <Header translate={translate} still={prefersReducedMotion}>
          {titleComponent}
        </Header>
        <Card
          cardRef={cardRef}
          rotate={rotate}
          scale={scale}
          shadow={glowShadow}
          trace={trace}
          traceOpacity={traceOpacity}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          still={prefersReducedMotion}
        >
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  still = false,
  children,
}: {
  translate: MotionValue<number>;
  still?: boolean;
  children: React.ReactNode;
}) => (
  <motion.div
    style={still ? undefined : { translateY: translate }}
    className="mx-auto max-w-5xl text-center"
  >
    {children}
  </motion.div>
);

export const Card = ({
  cardRef,
  rotate,
  scale,
  shadow,
  trace,
  traceOpacity,
  onPointerMove,
  onPointerLeave,
  still = false,
  children,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  shadow: MotionValue<string>;
  trace: MotionValue<string>;
  traceOpacity: MotionValue<number>;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  still?: boolean;
  children: React.ReactNode;
}) => (
  <motion.div
    ref={cardRef}
    onPointerMove={onPointerMove}
    onPointerLeave={onPointerLeave}
    style={
      still
        ? { boxShadow: `${STATIC_GLOW}, ${DEPTH_SHADOW}` }
        : { rotateX: rotate, scale, boxShadow: shadow }
    }
    className={cn(
      /*
       * WIDTH IS CAPPED FOR THE PROJECTION, NOT FOR THE LAYOUT.
       *
       * A tilted card paints wider than it measures: at 38 degrees and 800px of
       * perspective the near edge magnifies by about 1.27, so a `max-w-5xl`
       * card painted 1360px across a 1270px viewport and put a horizontal
       * scrollbar on the whole page. Measured total factor is 1.33 at `md` and
       * up (perspective plus the 1.05 resting scale) and 0.95 below it (the
       * shorter card and the 0.8 mobile scale), so the viewport caps differ:
       * 72vw once the card is tall, 90vw while it is short.
       */
      "relative mx-auto -mt-8 h-[26rem] w-full max-w-[min(56rem,90vw)] rounded-[30px] border-4 p-2 md:h-[34rem] md:max-w-[min(56rem,72vw)] md:p-4",
      // The shell is the warm dark end of the ink ramp in both themes: it is a
      // device bezel, and a bezel that turns cream in light mode stops reading
      // as an object. The border is brand-tinted so the rim light looks like it
      // belongs to the frame rather than sitting behind it.
      "border-brand-500/25 bg-ink-900",
    )}
  >
    {/*
      The trace ring.

      The pointer gradient fills the whole box and is then masked to just its
      own padding: two mask layers, one clipped to the content box, composited
      with `exclude`, leaves the 3px frame and nothing else. Painting the
      gradient on a full-size box and masking it — rather than trying to place a
      shape on the border directly — is what lets the highlight run smoothly
      around the corners.
    */}
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -inset-[5px] rounded-[34px] transition-opacity duration-300"
      style={{
        background: trace,
        opacity: traceOpacity,
        mixBlendMode: "screen",
        padding: 5,
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    />

    {/* The screen catches the same rim on its inside edge. Written as an
        explicit inset shadow, not `ring-1 ring-inset`: `ring-inset` was renamed
        to `inset-ring` in Tailwind v4, so the old spelling is dropped as an
        unknown class and the ring resolves to transparent — visibly nothing,
        silently. */}
    <div
      className="relative size-full overflow-hidden rounded-2xl bg-ink-50 dark:bg-ink-950"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,125,41,0.22)" }}
    >
      {children}
    </div>
  </motion.div>
);
