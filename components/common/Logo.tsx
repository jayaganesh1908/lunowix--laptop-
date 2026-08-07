import Link from "next/link";
import { cn } from "@/lib/utils/cn";

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
