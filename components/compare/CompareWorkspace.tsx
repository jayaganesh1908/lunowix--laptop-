"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, GitCompareArrows, History, Link2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ComparisonTable } from "./ComparisonTable";
import { ProductSelector } from "./ProductSelector";
import { Button } from "@/components/common/Button";
import { buttonStyles } from "@/components/common/buttonStyles";
import { EmptyState } from "@/components/common/EmptyState";
import { PriceCheckedAt } from "@/components/common/PriceCheckedAt";
import { useCompare } from "@/lib/hooks/useCompare";
import { useToast } from "@/components/providers/ToastProvider";
import { categoryBySlug } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";

export function CompareWorkspace() {
  const compare = useCompare();
  const [first, second] = [compare.products[0] ?? null, compare.products[1] ?? null];
  const { recordHistory, setSlot, hydrated } = compare;
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  /*
   * A comparison you can send to someone.
   *
   * The tray lives in localStorage, which means it lived in exactly one
   * browser: the person choosing the laptop could not show it to the person
   * paying for it. `?a=…&b=…` seeds the tray from the URL, so a link carries
   * the comparison.
   *
   * It runs ONCE, after hydration, and only when the params are present. The
   * URL seeds the tray; the tray does not then rewrite the URL, because a
   * two-way binding here would fight the user every time they changed a slot.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !hydrated) return;
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (!a && !b) return;

    seeded.current = true;
    if (a) setSlot(0, a);
    if (b) setSlot(1, b);
  }, [searchParams, setSlot, hydrated]);

  /*
   * Every noun on this screen follows what is in the tray: "Pick two phones",
   * "Browse headphones". The page used to say "laptop" everywhere, which was
   * accurate only because the tray silently discarded everything else.
   */
  const meta = compare.category ? categoryBySlug.get(compare.category) : undefined;
  const noun = meta ? meta.label.toLowerCase() : "product";
  const plural = meta ? meta.pluralLabel.toLowerCase() : "products";
  const browseHref = meta ? `/${meta.route}` : "/products";

  // Record the pair once both slots are filled so the profile page can list it.
  useEffect(() => {
    if (first && second) recordHistory([first.id, second.id]);
  }, [first, second, recordHistory]);

  const ready = Boolean(first && second);

  const shareLink = async () => {
    if (!first || !second) return;
    const url = `${window.location.origin}/compare?a=${first.id}&b=${second.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused in plenty of ordinary situations — an
      // insecure origin, a denied permission. Show the link so it can still be
      // copied by hand rather than failing silently.
      toast(url);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductSelector
          label={`First ${noun}`}
          selected={first}
          category={second?.category ?? null}
          excludeIds={second ? [second.id] : []}
          onSelect={(product) => compare.setSlot(0, product.id)}
          onClear={() => first && compare.remove(first.id)}
        />
        <ProductSelector
          label={`Second ${noun}`}
          selected={second}
          category={first?.category ?? null}
          excludeIds={first ? [first.id] : []}
          onSelect={(product) => compare.setSlot(1, product.id)}
          onClear={() => second && compare.remove(second.id)}
        />
      </div>

      {ready ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Highlighted cells mark the stronger figure in each row. Price difference:{" "}
              <span className="font-semibold text-ink-900 dark:text-white">
                {formatPrice(Math.abs(first!.price - second!.price))}
              </span>
              <PriceCheckedAt product={first!} className="ml-2" />
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareLink}
                icon={
                  copied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Link2 className="size-3.5" aria-hidden />
                  )
                }
              >
                {copied ? "Link copied" : "Copy link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={compare.clear}
                icon={<RotateCcw className="size-3.5" aria-hidden />}
              >
                Clear comparison
              </Button>
            </div>
          </div>

          <ComparisonTable entries={[first!, second!]} />
        </>
      ) : (
        <EmptyState
          icon={<GitCompareArrows className="size-6" aria-hidden />}
          title={first ? `Pick a second ${noun}` : "Pick two products to compare"}
          description={
            first
              ? `Search the empty slot above, or add another ${noun} from any product card using the compare button.`
              : "Search either slot above, or add products from any card using the compare button. Laptops, phones and headphones can all be compared — each against its own kind."
          }
          action={
            <Link href={browseHref} className={buttonStyles()}>
              Browse {plural}
            </Link>
          }
        />
      )}

      {compare.history.length > 0 ? (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            <History className="size-4" aria-hidden />
            Recent comparisons
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {compare.history.map((pair) => (
              <li key={pair.map((item) => item.id).join("-")}>
                <button
                  type="button"
                  onClick={() => {
                    compare.setSlot(0, pair[0].id);
                    compare.setSlot(1, pair[1].id);
                  }}
                  className="card-surface w-full p-4 text-left transition hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]"
                >
                  <span className="block text-sm font-semibold">{pair[0].name}</span>
                  <span className="my-1 block text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                    vs
                  </span>
                  <span className="block text-sm font-semibold">{pair[1].name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
