"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface ImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

export function ImageGallery({ images, alt, className }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="card-surface relative aspect-4/3 overflow-hidden bg-ink-50 dark:bg-ink-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={`${alt} — view ${active + 1} of ${images.length}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={cn(
                "object-cover transition-transform duration-500",
                zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in",
              )}
            />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setZoomed((value) => !value)}
          aria-pressed={zoomed}
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
          className="glass-strong absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition hover:text-brand-600 dark:text-ink-200"
        >
          <ZoomIn className="size-4" aria-hidden />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Product images"
        className="no-scrollbar flex gap-3 overflow-x-auto"
      >
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Show image ${index + 1}`}
            onClick={() => {
              setActive(index);
              setZoomed(false);
            }}
            className={cn(
              "relative aspect-4/3 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition",
              index === active
                ? "border-brand-500"
                : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
