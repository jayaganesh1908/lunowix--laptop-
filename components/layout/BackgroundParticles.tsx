"use client";

import { Particles } from "@/components/ui/particles";

/**
 * Site-wide particle field.
 *
 * Fixed to the viewport rather than sized to the document: a canvas spanning a
 * long page would be enormous (and would need re-sizing every time content
 * height changed), whereas a viewport-sized layer stays behind the content the
 * whole way down for a fraction of the pixels.
 *
 * Sits at `-z-10`. `body`'s background propagates to the canvas, so a negative
 * z-index child still paints above it — but below every section, card and
 * surface in the app.
 */
export function BackgroundParticles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Particles
        className="h-full w-full"
        quantity={240}
        size={1.2}
        staticity={35}
        alphaRange={[0.35, 1]}
        color="#ff6b00"
      />
    </div>
  );
}
