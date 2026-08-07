"use client";

import { useRouter } from "next/navigation";
import { GitCompareArrows, Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { useCompare } from "@/lib/hooks/useCompare";
import { useWishlist } from "@/lib/hooks/useWishlist";
import type { Laptop } from "@/lib/types/laptop";
import { cn } from "@/lib/utils/cn";

export function LaptopActions({
  laptop,
  className,
}: {
  laptop: Laptop;
  className?: string;
}) {
  const router = useRouter();
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast } = useToast();

  const saved = wishlist.has(laptop.id);
  const comparing = compare.has(laptop.id);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button
        size="lg"
        icon={<ShoppingCart className="size-4" aria-hidden />}
        onClick={() =>
          toast(
            "Checkout is not wired up in this demo — the affiliate link goes here.",
            "info",
          )
        }
        className="sm:flex-1"
      >
        Buy Now
      </Button>

      <Button
        size="lg"
        variant={saved ? "secondary" : "outline"}
        aria-pressed={saved}
        icon={<Heart className={cn("size-4", saved && "fill-current")} aria-hidden />}
        onClick={() => {
          const added = wishlist.toggle(laptop.id);
          toast(added ? "Added to your wishlist" : "Removed from your wishlist");
        }}
      >
        {saved ? "In wishlist" : "Add to Wishlist"}
      </Button>

      <Button
        size="lg"
        variant={comparing ? "secondary" : "outline"}
        aria-pressed={comparing}
        icon={<GitCompareArrows className="size-4" aria-hidden />}
        onClick={() => {
          const added = compare.toggle(laptop.id);
          toast(added ? "Added to compare" : "Removed from compare");
          if (added && compare.count >= 1) router.push("/compare");
        }}
      >
        Compare
      </Button>
    </div>
  );
}
