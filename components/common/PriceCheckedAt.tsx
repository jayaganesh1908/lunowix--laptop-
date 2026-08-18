import type { Product } from "@/lib/types";
import { priceCheckedFor } from "@/lib/data/products";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

/**
 * The date beside a price.
 *
 * Deliberately plain and quiet: it is a provenance note, not a feature. What
 * matters is that it is derived from the data rather than typed into a layout,
 * so it cannot say "checked today" a year from now.
 */
export function PriceCheckedAt({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const checked = priceCheckedFor(product);

  return (
    <span className={cn("text-xs text-ink-500 dark:text-ink-400", className)}>
      Price checked{" "}
      <time dateTime={checked}>{formatDate(checked)}</time>
    </span>
  );
}
