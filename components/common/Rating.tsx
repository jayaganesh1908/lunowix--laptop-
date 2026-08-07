import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatters";

export interface RatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function Rating({ value, count, size = "sm", className }: RatingProps) {
  const starSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${value} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => {
          const filled = value - index;
          return (
            <Star
              key={index}
              className={cn(
                starSize,
                filled >= 1
                  ? "fill-brand-500 text-brand-500"
                  : filled > 0
                    ? "fill-brand-500/40 text-brand-500"
                    : "fill-transparent text-ink-300 dark:text-ink-600",
              )}
            />
          );
        })}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-ink-700 dark:text-ink-200">
        {value.toFixed(1)}
      </span>
      {count !== undefined ? (
        <span className="text-xs text-ink-500 dark:text-ink-400">
          ({formatNumber(count)})
        </span>
      ) : null}
    </div>
  );
}
