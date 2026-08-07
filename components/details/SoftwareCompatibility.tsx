"use client";

import { motion } from "framer-motion";
import { SoftwareCard } from "@/components/common/SoftwareCard";
import { Badge } from "@/components/common/Badge";
import { softwareCatalog } from "@/lib/data/software";
import type { SoftwareCompatibilityMap } from "@/lib/types/software";
import { compatibilityTone } from "@/lib/utils/formatters";
import { inView, staggerFast } from "@/lib/utils/animations";

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
