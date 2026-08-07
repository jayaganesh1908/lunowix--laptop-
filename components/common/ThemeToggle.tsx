"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/hooks/useTheme";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl border transition",
        "border-ink-200 text-ink-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700",
        "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10 dark:hover:text-brand-300",
        className,
      )}
    >
      {/* Before mount the stored preference is unknown, so render a stable
          icon and let the swap happen once hydration settles. */}
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <Sun className="size-[18px]" aria-hidden />
            ) : (
              <Moon className="size-[18px]" aria-hidden />
            )}
          </motion.span>
        </AnimatePresence>
      ) : (
        <Moon className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
