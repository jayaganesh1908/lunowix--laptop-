"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { LunowixMark } from "@/components/common/LunowixMark";
import { SignInForm } from "@/components/ui/sign-in-form";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/*
 * Upstream is a black-and-purple glass card. Three things were re-pointed:
 *
 *  - Its `Input` used shadcn tokens (`text-foreground`, `bg-input/30`,
 *    `border-input`, `ring-ring/50`, `aria-invalid:ring-destructive`). This
 *    project defines none of them, so every one of those classes compiled to
 *    nothing. The fields now use the same ink/brand classes as the rest of the
 *    app and are theme-aware.
 *  - The purple gradient stack and `bg-black` shell fought the warm palette, so
 *    the wash is brand orange and the shell inherits the page.
 *  - `useState(null)` inferred `never`, which is why upstream casts with
 *    `as any` on every focus handler. Typed properly instead.
 *
 * What remains here is only the CHROME — the tilt, the cursor glow, the card
 * surface and the header. The fields themselves live in `SignInForm`, shared
 * with the split-panel login page so the two cannot drift apart.
 */

export interface SignInCardProps {
  /** Front-end only by default; supply this to do something real. */
  onSubmit?: (values: { email: string; password: string; remember: boolean }) => void;
  className?: string;
}

export function SignInCard({ onSubmit, className }: SignInCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  // Cursor trace: a glow that follows the pointer across the card face.
  const [trace, setTrace] = useState({ x: 50, y: 50, on: false });

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
    setTrace({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      on: true,
    });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setTrace((value) => ({ ...value, on: false }));
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn("w-full max-w-sm", className)}
      style={{ perspective: 1500 }}
    >
      <motion.div
        className="relative"
        style={prefersReducedMotion ? undefined : { rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="group relative">
          {/* Cursor trace glow — brand-tinted, follows the pointer. */}
          <div
            aria-hidden
            /* `-inset-4` on the smallest screens: at 320px the card is already
               the full width of the page, and a glow bleeding 32px past it on
               both sides added 16px of horizontal scroll to the sign-in page. */
            className="pointer-events-none absolute -inset-4 rounded-[2rem] transition-opacity duration-300 sm:-inset-8"
            style={{
              opacity: trace.on ? 1 : 0,
              background: `radial-gradient(220px circle at ${trace.x}% ${trace.y}%, rgb(var(--card-glow) / 0.28), transparent 70%)`,
            }}
          />

          {/* Card */}
          <div className="card-surface relative overflow-hidden p-6">
            <div className="mb-5 space-y-2 text-center">
              <LunowixMark className="mx-auto h-10 w-auto" />
              <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Sign in to pick up your wishlist and comparisons.
              </p>
            </div>

            <SignInForm onSubmit={onSubmit} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { SignInCard as Component };
