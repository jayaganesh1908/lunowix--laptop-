import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "brand"
  | "neutral"
  | "success"
  | "info"
  | "warning"
  | "danger";

const TONES: Record<BadgeTone, string> = {
  brand:
    "border-brand-500/30 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200",
  // ink-100 rather than ink-50: ink-50 is now the page background, so a neutral
  // badge sitting outside a card would otherwise have no fill at all.
  neutral:
    "border-ink-200 bg-ink-100 text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200",
  success:
    "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  info: "border-sky-500/30 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  warning:
    "border-yellow-500/30 bg-yellow-50 text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-200",
  danger:
    "border-rose-500/30 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
