"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { fadeUp } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

export interface DashboardCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Percentage change against the previous period. */
  delta?: number;
  icon: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: DashboardCardProps) {
  const positive = (delta ?? 0) >= 0;
  const Trend = positive ? TrendingUp : TrendingDown;

  return (
    <motion.div variants={fadeUp} className={cn("card-surface p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          {icon}
        </div>
        {delta !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              positive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            )}
          >
            <Trend className="size-3" aria-hidden />
            {positive ? "+" : ""}
            {delta}%
          </span>
        ) : null}
      </div>

      <p className="mt-4 font-mono text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-600 dark:text-ink-300">{label}</p>
      {hint ? (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>
      ) : null}
    </motion.div>
  );
}
