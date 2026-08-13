import Link from "next/link";
import { BadgeCheck, ChevronRight, Star } from "lucide-react";
import { type Review } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";

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
    "border-ink-200 bg-ink-100 text-ink-700 dark:border-white/10 dark:bg-ink-950/60 dark:text-ink-200",
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

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-500 dark:text-ink-400">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded transition hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "font-medium text-ink-900 dark:text-white" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last ? (
                <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-surface flex flex-col items-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <div className="max-w-md">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("shimmer-surface rounded-lg", className)}
    />
  );
}

export function LaptopCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden p-4">
      <Skeleton className="aspect-4/3 w-full rounded-xl" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-4/5" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-28" />
      </div>
    </div>
  );
}

export function LaptopGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading laptops"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <LaptopCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading laptop" className="grid gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-4/3 w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-12 w-40" />
        <div className="grid grid-cols-2 gap-3 pt-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Lunowix home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-[0_6px_18px_-8px_rgba(255,107,0,0.9)]">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none">
          <path
            d="M4 16.5V6.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 6.5v10"
            stroke="#0b0b0b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M2.5 16.5h19L20.2 19a1.5 1.5 0 0 1-1.35.85H5.15A1.5 1.5 0 0 1 3.8 19l-1.3-2.5Z"
            fill="#0b0b0b"
          />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-white">
        Luno<span className="text-brand-600 dark:text-brand-400">wix</span>
      </span>
    </Link>
  );
}

export function ReviewCard({
  review,
  className,
}: {
  review: Review;
  className?: string;
}) {
  const initials = review.author
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <article className={cn("card-surface p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {review.author}
            {review.verified ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                title="Verified purchase"
              >
                <BadgeCheck className="size-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {formatDate(review.date)}
          </p>
        </div>
        <Rating value={review.rating} />
      </header>

      <h3 className="mt-4 text-sm font-semibold">{review.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        {review.comment}
      </p>
    </article>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "text-center")}>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Brand marks are not part of the lucide icon set, so the five we need are
 * inlined here as minimal single-path SVGs.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
} as const;

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.02 4.13H5.05l12.03 15.64Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 6.19a3.65 3.65 0 1 0 0 7.3 3.65 3.65 0 0 0 0-7.3Zm0 6.02a2.37 2.37 0 1 1 0-4.74 2.37 2.37 0 0 1 0 4.74Zm4.65-6.16a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z" />
    </svg>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.51 2.51 0 0 0-1.77 1.78A26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .42 4.81 2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.78A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05a4.2 4.2 0 0 1 3.78-2.08C21.6 8.56 23 10.7 23 14.2V21h-4v-6.02c0-1.44-.03-3.29-2-3.29-2.01 0-2.32 1.57-2.32 3.19V21h-4V9Z" />
    </svg>
  );
}

export function GithubIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
