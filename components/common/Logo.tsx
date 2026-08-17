import Link from "next/link";
import { LunowixMark } from "@/components/common/LunowixMark";
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
      {/*
        The mark carries its own orange, so it is NOT set on a brand-gradient
        tile the way the previous laptop glyph was — two oranges at that size
        muddy each other, and the tile's halo competed with the mark's own X.

        The MARK, not the full lockup: the artwork stacks the wordmark under the
        mark, and at the 36px this renders the wordmark would be ~8px tall. The
        text beside it carries the name instead. Pass `lockup` where there is
        vertical room for the real thing.
      */}
      <LunowixMark className="h-9 w-auto" />
      <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-white">
        Luno<span className="text-brand-600 dark:text-brand-400">wix</span>
      </span>
    </Link>
  );
}
