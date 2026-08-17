"use client";

import Image from "next/image";
import Link from "next/link";
import { GitCompareArrows, Heart, Trash2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { buttonStyles } from "@/components/common/buttonStyles";
import { EmptyState } from "@/components/common/EmptyState";
import { LaptopCardSkeleton } from "@/components/common/LoadingSkeleton";
import { Rating } from "@/components/common/Rating";
import { useToast } from "@/components/providers/ToastProvider";
import { useCompare } from "@/lib/hooks/useCompare";
import { useWishlist } from "@/lib/hooks/useWishlist";
import { formatPrice, shortCpu, shortGpu } from "@/lib/utils/formatters";
import { categoryFor, productHref } from "@/lib/types";

export function WishlistBoard() {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast } = useToast();

  // Storage is unavailable until hydration; show skeletons rather than a false empty state.
  if (!wishlist.hydrated) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <LaptopCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (wishlist.products.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-6" aria-hidden />}
        title="Nothing saved yet"
        description="Tap the heart on any product card and it will show up here, ready to compare later."
        action={
          <Link href="/laptops" className={buttonStyles()}>
            Browse laptops
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          {wishlist.count} saved {wishlist.count === 1 ? "laptop" : "laptops"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            wishlist.clear();
            toast("Wishlist cleared", "info");
          }}
          icon={<Trash2 className="size-3.5" aria-hidden />}
        >
          Clear wishlist
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {wishlist.products.map((laptop) => (
          <li key={laptop.id} className="card-surface flex flex-col gap-4 p-4 sm:flex-row">
            <Link
              href={productHref(laptop)}
              className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl sm:w-44"
            >
              <Image
                src={laptop.image}
                alt={laptop.name}
                fill
                sizes="(max-width: 640px) 100vw, 176px"
                className="object-cover"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                {laptop.brand}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug">
                <Link href={productHref(laptop)} className="hover:text-brand-600 dark:hover:text-brand-400">
                  {laptop.name}
                </Link>
              </h2>
              {/* `processor`/`gpu`/`ram` exist only on laptops, so the summary is
                  picked per category rather than assuming a laptop spec sheet. */}
              <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-400">
                {laptop.category === "laptop"
                  ? `${shortCpu(laptop.specs.processor)} · ${shortGpu(laptop.specs.gpu)} · ${laptop.specs.ram}GB`
                  : categoryFor(laptop).label}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Rating value={laptop.rating} count={laptop.reviews} />
                <Badge tone="neutral">Overall {laptop.performance.overall}</Badge>
              </div>

              <p className="mt-2 font-mono text-lg font-bold tabular-nums">
                {formatPrice(laptop.price)}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Link
                  href={productHref(laptop)}
                  className={buttonStyles({ size: "sm" })}
                >
                  View details
                </Link>
                <Button
                  size="sm"
                  variant={compare.has(laptop.id) ? "secondary" : "outline"}
                  icon={<GitCompareArrows className="size-3.5" aria-hidden />}
                  onClick={() => {
                    const added = compare.toggle(laptop.id);
                    toast(added ? "Added to compare" : "Removed from compare");
                  }}
                >
                  {compare.has(laptop.id) ? "In compare" : "Compare"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-3.5" aria-hidden />}
                  onClick={() => {
                    wishlist.remove(laptop.id);
                    toast(`${laptop.name} removed from wishlist`, "info");
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
