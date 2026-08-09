"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BatteryCharging,
  Brain,
  Code2,
  Gamepad2,
  GitCompareArrows,
  Heart,
  Monitor,
  ShoppingCart,
  Video,
} from "lucide-react";
import { Badge } from "@/components/common/Display";
import { Button, GameCard, CircularMeter, PerformanceMeter, SoftwareCard } from "@/components/common";
import { useToast } from "@/components/providers";
import { softwareCatalog } from "@/lib/data";
import { useCompare, useWishlist } from "@/lib/hooks";
import { type GameBenchmark, type Laptop, type PerformanceScores as Scores, type SoftwareCompatibilityMap } from "@/lib/types";
import { inView, staggerFast, cn, compatibilityTone } from "@/lib/utils";

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

const METRICS = [
  {
    key: "coding",
    label: "Coding",
    icon: <Code2 className="size-4 text-ink-400" aria-hidden />,
    description: "Compile throughput, container and IDE headroom.",
  },
  {
    key: "gaming",
    label: "Gaming",
    icon: <Gamepad2 className="size-4 text-ink-400" aria-hidden />,
    description: "1080p raster performance against the panel's refresh rate.",
  },
  {
    key: "editing",
    label: "Editing",
    icon: <Video className="size-4 text-ink-400" aria-hidden />,
    description: "Timeline scrubbing and GPU-accelerated exports.",
  },
  {
    key: "battery",
    label: "Battery",
    icon: <BatteryCharging className="size-4 text-ink-400" aria-hidden />,
    description: "Mixed-use runtime away from a socket.",
  },
  {
    key: "display",
    label: "Display",
    icon: <Monitor className="size-4 text-ink-400" aria-hidden />,
    description: "Resolution, refresh rate and panel technology combined.",
  },
  {
    key: "aiDevelopment",
    label: "AI development",
    icon: <Brain className="size-4 text-ink-400" aria-hidden />,
    description: "VRAM-bound local inference and fine-tuning work.",
  },
] as const;

export function PerformanceScores({
  scores,
  className,
}: {
  scores: Scores;
  className?: string;
}) {
  return (
    <div className={cn("card-surface p-6", className)}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <CircularMeter score={scores.overall} />
          <p className="max-w-[9rem] text-center text-xs text-ink-500 dark:text-ink-400">
            Weighted across every category below
          </p>
        </div>

        <div className="grid w-full flex-1 gap-5 sm:grid-cols-2">
          {METRICS.map((metric, index) => (
            <PerformanceMeter
              key={metric.key}
              label={metric.label}
              icon={metric.icon}
              score={scores[metric.key]}
              description={metric.description}
              delay={index * 0.06}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GamesSupported({
  benchmarks,
  className,
}: {
  benchmarks: GameBenchmark[];
  className?: string;
}) {
  const playable = benchmarks.filter((game) => game.fps >= 60).length;

  return (
    <div className={className}>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Estimated 1080p frame rates at the preset shown.{" "}
        <span className="font-semibold text-ink-900 dark:text-white">
          {playable} of {benchmarks.length}
        </span>{" "}
        titles clear 60fps on this machine.
      </p>

      <motion.div
        variants={staggerFast}
        {...inView}
        className={cn(
          "mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5",
        )}
      >
        {benchmarks.map((benchmark) => (
          <GameCard key={benchmark.id} benchmark={benchmark} />
        ))}
      </motion.div>
    </div>
  );
}

const LEGEND = [
  "Runs Smoothly",
  "Runs Fine",
  "Limited",
  "Not Recommended",
] as const;

export function SoftwareCompatibility({
  compatibility,
  className,
}: {
  compatibility: SoftwareCompatibilityMap;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-600 dark:text-ink-300">Legend:</span>
        {LEGEND.map((status) => (
          <Badge key={status} tone={compatibilityTone(status)}>
            {status}
          </Badge>
        ))}
      </div>

      <motion.div
        variants={staggerFast}
        {...inView}
        className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        {softwareCatalog.map((software) => (
          <SoftwareCard
            key={software.id}
            software={software}
            status={compatibility[software.name] ?? "Runs Fine"}
          />
        ))}
      </motion.div>
    </div>
  );
}
