"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/common/GameCard";
import type { GameBenchmark } from "@/lib/types/game";
import { inView, staggerFast } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

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
