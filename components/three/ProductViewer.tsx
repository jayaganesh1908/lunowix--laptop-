"use client";

import dynamic from "next/dynamic";
import { Box, Images, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageGallery } from "@/components/details/ImageGallery";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { type Model3DParams } from "@/lib/types";

/**
 * `ssr: false` because three.js touches `window` at import time, and the whole
 * bundle is pulled in only once a viewer is actually on screen — a product page
 * that nobody scrolls costs nothing.
 */
const ProductScene = dynamic(() => import("./Scenes").then((mod) => mod.ProductScene), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

export interface ProductViewerProps {
  params: Model3DParams;
  images: string[];
  alt: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */

function SceneSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
        <p className="text-xs text-ink-500 dark:text-ink-400">Preparing 3D view…</p>
      </div>
    </div>
  );
}

/**
 * WebGL availability, resolved after mount.
 *
 * `null` means "not decided yet", which matters: assuming support and being
 * wrong shows a blank canvas, and assuming no support hides the feature from
 * everyone during hydration.
 */
function useWebGL() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context =
        canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl");
      setSupported(Boolean(context));

      // Browsers cap concurrent WebGL contexts (commonly 16) and drop the
      // oldest when the cap is hit. A probe that holds onto its context would
      // count against a budget the actual scene needs.
      if (context && "getExtension" in context) {
        (context as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

/** True once the element has been on screen, so offscreen viewers stay idle. */
function useHasBeenVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;

    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    // Resolve synchronously when the viewer is already on screen. The observer
    // is for viewers further down the page; making the above-the-fold case wait
    // for it costs a frame for no benefit, and a page that is not compositing —
    // a background tab, a hidden pane — never delivers the callback at all, so
    // relying on it alone can leave the viewer stuck on its skeleton.
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.top < window.innerHeight + 200 && rect.bottom > -200) {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);

  return { ref, seen };
}

/* -------------------------------------------------------------------------- */

export function ProductViewer({ params, images, alt, className }: ProductViewerProps) {
  const [mode, setMode] = useState<"3d" | "photos">("3d");
  const [resetKey, setResetKey] = useState(0);
  const webgl = useWebGL();
  const reducedMotion = usePrefersReducedMotion();
  const { ref, seen } = useHasBeenVisible<HTMLDivElement>();

  // No WebGL means no choice to offer — render the gallery and say nothing.
  if (webgl === false) {
    return <ImageGallery images={images} alt={alt} className={className} />;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        ref={ref}
        className="card-surface relative aspect-4/3 overflow-hidden bg-gradient-to-b from-ink-100 to-ink-50 dark:from-ink-900 dark:to-ink-950"
      >
        {mode === "3d" ? (
          <>
            {seen && webgl ? (
              <ProductScene
                key={resetKey}
                params={params}
                reducedMotion={reducedMotion}
              />
            ) : (
              <SceneSkeleton />
            )}

            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-ink-500 dark:text-ink-400">
              Drag to orbit · scroll to zoom
            </p>

            <button
              type="button"
              onClick={() => setResetKey((value) => value + 1)}
              aria-label="Reset the 3D view"
              className="glass-strong absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition hover:text-brand-600 dark:text-ink-200"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </>
        ) : (
          <ImageGallery images={images} alt={alt} />
        )}

        <div
          role="tablist"
          aria-label="Product view mode"
          className="glass-strong absolute left-3 top-3 flex gap-1 rounded-xl p-1"
        >
          {(
            [
              { value: "3d", label: "3D", Icon: Box },
              { value: "photos", label: "Photos", Icon: Images },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                mode === value
                  ? "bg-brand-500 text-ink-950"
                  : "text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "3d" && (
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Modelled from this product&rsquo;s own specification — size, thickness, finish and
          panel brightness are all read from the spec sheet, not styled by hand.
        </p>
      )}
    </div>
  );
}
