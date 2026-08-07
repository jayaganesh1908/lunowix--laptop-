"use client";

import { motion } from "framer-motion";
import { Gauge } from "lucide-react";
import { Badge } from "./Badge";
import type { GameBenchmark } from "@/lib/types/game";
import { gameTierTone } from "@/lib/utils/formatters";
import { fadeUp } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

const PRESET_TONE = {
  Ultra: "brand",
  High: "success",
  Medium: "info",
  Low: "neutral",
} as const;

export function GameCard({
  benchmark,
  className,
}: {
  benchmark: GameBenchmark;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface flex flex-col gap-3 p-4 hover:border-brand-500/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-xl bg-ink-100 text-xl dark:bg-white/5"
          >
            {benchmark.icon}
          </span>
          <h3 className="text-sm font-semibold leading-tight">{benchmark.name}</h3>
        </div>
        <Badge tone={gameTierTone(benchmark.tier)}>{benchmark.tier}</Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
              {benchmark.fps}
            </span>
            <span className="text-xs font-medium text-ink-500 dark:text-ink-400">fps</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
            <Gauge className="size-3" aria-hidden />
            1080p estimate
          </p>
        </div>
        <Badge tone={PRESET_TONE[benchmark.graphics]}>{benchmark.graphics}</Badge>
      </div>
    </motion.article>
  );
}
