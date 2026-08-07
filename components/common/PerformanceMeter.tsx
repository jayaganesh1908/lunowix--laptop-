"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { scoreLabel } from "@/lib/utils/formatters";

/** Red → amber → emerald as the score climbs, with orange for the mid band. */
function barColor(score: number) {
  if (score >= 80) return "from-emerald-400 to-emerald-600";
  if (score >= 60) return "from-brand-400 to-brand-600";
  if (score >= 40) return "from-yellow-400 to-yellow-600";
  return "from-rose-400 to-rose-600";
}

export interface PerformanceMeterProps {
  label: string;
  score: number;
  description?: string;
  icon?: React.ReactNode;
  delay?: number;
  showLabel?: boolean;
  className?: string;
}

export function PerformanceMeter({
  label,
  score,
  description,
  icon,
  delay = 0,
  showLabel = true,
  className,
}: PerformanceMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
          {icon}
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          {showLabel ? (
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {scoreLabel(score)}
            </span>
          ) : null}
          <span className="font-mono text-sm font-semibold tabular-nums text-ink-900 dark:text-white">
            {score}
          </span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score`}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10"
      >
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", barColor(score))}
          initial={{ width: 0 }}
          animate={inView ? { width: `${score}%` } : { width: 0 }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {description ? (
        <p className="text-xs text-ink-500 dark:text-ink-400">{description}</p>
      ) : null}
    </div>
  );
}

export interface CircularMeterProps {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

export function CircularMeter({
  score,
  label = "Overall",
  size = 128,
  className,
}: CircularMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label} score ${score} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-100 dark:stroke-white/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#meter-gradient)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={
            inView
              ? { strokeDashoffset: circumference * (1 - score / 100) }
              : { strokeDashoffset: circumference }
          }
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="meter-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff8733" />
            <stop offset="100%" stopColor="#e05c00" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold tabular-nums">{score}</span>
        <span className="text-[11px] uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {label}
        </span>
      </div>
    </div>
  );
}
