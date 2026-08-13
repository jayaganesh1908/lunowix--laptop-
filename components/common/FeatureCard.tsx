"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface group relative overflow-hidden p-6",
        "hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]",
        className,
      )}
    >
      {/* Decorative wash that warms up on hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-brand-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="relative mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        {description}
      </p>
    </motion.article>
  );
}
