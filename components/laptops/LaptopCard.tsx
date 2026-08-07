"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Cpu, GitCompareArrows, HardDrive, Heart, MemoryStick, MonitorPlay } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Rating } from "@/components/common/Rating";
import { useToast } from "@/components/providers/ToastProvider";
import { useCompare } from "@/lib/hooks/useCompare";
import { useWishlist } from "@/lib/hooks/useWishlist";
import type { Laptop } from "@/lib/types/laptop";
import { fadeUp } from "@/lib/utils/animations";
import {
  discountPercent,
  formatPrice,
  formatStorage,
  shortCpu,
  shortGpu,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export interface LaptopCardProps {
  laptop: Laptop;
  /** Renders the image with `priority` for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

export function LaptopCard({ laptop, priority = false, className }: LaptopCardProps) {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast } = useToast();

  const saved = wishlist.has(laptop.id);
  const comparing = compare.has(laptop.id);
  const discount = discountPercent(laptop.price, laptop.mrp);

  const onWishlist = () => {
    const added = wishlist.toggle(laptop.id);
    toast(added ? `${laptop.name} added to wishlist` : `${laptop.name} removed from wishlist`);
  };

  const onCompare = () => {
    const added = compare.toggle(laptop.id);
    toast(
      added
        ? `${laptop.name} added to compare`
        : `${laptop.name} removed from compare`,
      added ? "success" : "info",
    );
  };

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden transition-shadow",
        "hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(255,107,0,0.25),0_24px_56px_-24px_rgba(255,107,0,0.5)]",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-ink-50 dark:bg-ink-900">
        <Image
          src={laptop.image}
          alt={`${laptop.name} laptop`}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {laptop.bestseller ? <Badge tone="brand">Bestseller</Badge> : null}
            {discount >= 15 ? <Badge tone="success">{discount}% off</Badge> : null}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onWishlist}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${laptop.name} from wishlist` : `Add ${laptop.name} to wishlist`}
            className={cn(
              "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
              saved ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
            )}
          >
            <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onCompare}
            aria-pressed={comparing}
            aria-label={comparing ? `Remove ${laptop.name} from compare` : `Add ${laptop.name} to compare`}
            className={cn(
              "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
              comparing ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
            )}
          >
            <GitCompareArrows className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          {laptop.brand}
        </p>

        <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight">
          {/* Stretched link keeps the whole card clickable without nesting buttons. */}
          <Link href={`/laptops/${laptop.id}`} className="after:absolute after:inset-0 after:content-['']">
            {laptop.name}
          </Link>
        </h3>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-600 dark:text-ink-300">
          <li className="flex items-center gap-1.5">
            <Cpu className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span className="truncate">{shortCpu(laptop.specs.processor)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MonitorPlay className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span className="truncate">{shortGpu(laptop.specs.gpu)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MemoryStick className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span>{laptop.specs.ram} GB RAM</span>
          </li>
          <li className="flex items-center gap-1.5">
            <HardDrive className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span>{formatStorage(laptop.specs.storage)}</span>
          </li>
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{laptop.specs.display.size}&quot;</Badge>
          <Badge tone={laptop.specs.display.refreshRate >= 120 ? "info" : "neutral"}>
            {laptop.specs.display.refreshRate}Hz
          </Badge>
          <Badge tone="neutral">{laptop.specs.display.panel}</Badge>
        </div>

        <div className="mt-auto pt-4">
          <Rating value={laptop.rating} count={laptop.reviews} />
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatPrice(laptop.price)}
            </span>
            {discount > 0 ? (
              <span className="font-mono text-sm text-ink-500 line-through dark:text-ink-400">
                {formatPrice(laptop.mrp)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
