"use client";

import {
  BatteryCharging,
  Brain,
  Code2,
  Gamepad2,
  Monitor,
  Video,
} from "lucide-react";
import { CircularMeter, PerformanceMeter } from "@/components/common/PerformanceMeter";
import type { PerformanceScores as Scores } from "@/lib/types/laptop";
import { cn } from "@/lib/utils/cn";

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
