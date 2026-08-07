import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

/**
 * Dark ink on brand orange rather than white — white on #FF6B00 measures 2.6:1,
 * far below the WCAG AA 4.5:1 threshold, while ink-950 on the same fill is 6.9:1.
 *
 * The fill runs 400 → 500 rather than 500 → 600: brand-600 is tuned to be
 * legible as *text* on white, which makes it too dark to carry dark text itself
 * (4.1:1). Both stops here clear AA — 8.2:1 and 6.9:1.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-400 to-brand-500 text-ink-950 shadow-[0_8px_24px_-10px_rgba(255,107,0,0.7)] hover:from-brand-300 hover:to-brand-400 hover:shadow-[0_12px_32px_-10px_rgba(255,107,0,0.85)] active:from-brand-500 active:to-brand-600",
  secondary:
    "border border-brand-500/60 bg-brand-50 text-brand-700 hover:border-brand-500 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20",
  outline:
    "border border-ink-200 bg-transparent text-ink-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-white/15 dark:bg-transparent dark:text-ink-100 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10 dark:hover:text-brand-300",
  ghost:
    "bg-transparent text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/10",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-13 gap-2.5 px-7 text-base",
  icon: "size-10 justify-center",
};

/**
 * Lives in its own server-safe module (no `"use client"`) so server components
 * such as `not-found.tsx` can style a `<Link>` with the same tokens the
 * interactive `<Button>` uses.
 */
export const buttonStyles = ({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) =>
  cn(
    "inline-flex select-none items-center justify-center rounded-xl font-semibold tracking-tight transition-[background,color,border-color,box-shadow,transform] duration-200",
    "hover:-translate-y-px active:translate-y-0",
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
