import { BadgeCheck } from "lucide-react";
import { Rating } from "./Rating";
import type { Review } from "@/lib/types/laptop";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

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
      {/*
        `flex-wrap`, and the name row wraps too.

        The header was one unshrinkable line — avatar, name, "Verified" badge
        and the star rating all refusing to give way — so at 320px the card
        pushed 22px of horizontal scroll onto the whole detail page. Letting the
        rating drop to its own line costs nothing and removes the hard minimum.
      */}
      <header className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-ink-950"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
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
