"use client";

import { motion } from "framer-motion";
import { Badge } from "./Badge";
import type { CompatibilityStatus, Software } from "@/lib/types/software";
import { compatibilityTone } from "@/lib/utils/formatters";
import { fadeUp } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

export function SoftwareCard({
  software,
  status,
  className,
}: {
  software: Software;
  status: CompatibilityStatus;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface flex items-center gap-4 p-4 hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-xl dark:bg-ink-950/60"
      >
        {software.icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{software.name}</h3>
        <p className="truncate text-xs text-ink-500 dark:text-ink-400">
          {software.vendor} · {software.category}
        </p>
      </div>
      <Badge tone={compatibilityTone(status)} className="shrink-0">
        {status}
      </Badge>
    </motion.article>
  );
}
