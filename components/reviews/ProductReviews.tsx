"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { ReviewCard } from "@/components/common/ReviewCard";
import { buttonStyles } from "@/components/common/buttonStyles";
import { useSession } from "@/lib/hooks/useSession";
import { useToast } from "@/components/providers/ToastProvider";
import { checkRating, checkReviewComment, checkReviewTitle } from "@/lib/validation/rules";
import { type Review } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Reviews people have written, and the form to add one.
 *
 * Mounted BELOW the generated sample reviews the detail page already ships, not
 * instead of them. The samples are what make a statically pre-rendered product
 * page look alive on a fresh install; these are real, and the heading says which
 * is which so neither is passed off as the other.
 *
 * The whole section is client-side and loads after paint, which keeps the detail
 * route statically pre-renderable — the reason the site builds 74 static pages.
 */

interface Summary {
  count: number;
  average: number | null;
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useSession();
  const { toast } = useToast();
  const pathname = usePathname();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ count: 0, average: null });
  const [mine, setMine] = useState<Review | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const titleId = useId();
  const commentId = useId();

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews/${productId}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as {
        reviews: Review[];
        summary: Summary;
        mine: Review | null;
      };

      setReviews(data.reviews);
      setSummary(data.summary);
      setMine(data.mine);

      // Pre-fill the form when editing, so it is an edit rather than a rewrite.
      if (data.mine) {
        setRating(data.mine.rating);
        setTitle(data.mine.title);
        setComment(data.mine.comment);
      }
    } catch {
      // Leave the section empty rather than showing an error: the page's own
      // sample reviews are still above it and the page is still useful.
    } finally {
      setLoaded(true);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  // `mine` is resolved from the session, so it has to be re-read when that changes.
  useEffect(() => {
    if (loaded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on the account only
  }, [user?.id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    /*
     * The same bounds the route enforces, from `@/lib/validation/rules`. The
     * route parses with zod built on those constants, so the two cannot disagree
     * without the shared numbers changing.
     */
    const found: Record<string, string> = {};
    const ratingError = checkRating(rating);
    if (ratingError) found.rating = ratingError;
    const titleError = checkReviewTitle(title);
    if (titleError) found.title = titleError;
    const commentError = checkReviewComment(comment);
    if (commentError) found.comment = commentError;

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch(`/api/reviews/${productId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim(), comment: comment.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(body.error ?? "Your review could not be saved.");
        return;
      }

      toast(mine ? "Your review has been updated." : "Thanks — your review is live.");
      await load();
    } catch {
      setFormError("Could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    try {
      const response = await fetch(`/api/reviews/${productId}`, { method: "DELETE" });
      if (!response.ok) return;

      setRating(5);
      setTitle("");
      setComment("");
      toast("Your review has been removed.");
      await load();
    } catch {
      toast("Could not remove the review just now.", "warning");
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-ink-200 bg-white/70 px-3 py-2 text-sm outline-none transition " +
    "placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 " +
    "dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

  return (
    <section aria-labelledby={`${productId}-written-reviews`} className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${productId}-written-reviews`} className="text-xl font-bold tracking-tight">
          Reviews from readers
        </h2>
        {summary.count > 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {summary.average} out of 5 · {summary.count}{" "}
            {summary.count === 1 ? "review" : "reviews"}
          </p>
        ) : null}
      </div>

      {loaded && reviews.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          No reader reviews yet. The ones above are sample copy that ships with the
          catalogue — be the first to write a real one.
        </p>
      ) : null}

      {reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}

      {user ? (
        <form onSubmit={submit} noValidate className="card-surface mt-6 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">
              {mine ? "Edit your review" : "Write a review"}
            </h3>
            {mine ? (
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
              Rating
            </legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} out of 5`}
                  aria-pressed={rating === value}
                  className="rounded p-0.5 transition hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-6",
                      value <= rating
                        ? "fill-brand-500 text-brand-500"
                        : "text-ink-300 dark:text-ink-600",
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={titleId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
              Title
            </label>
            <input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Solid daily driver"
              aria-invalid={Boolean(errors.title)}
              className={fieldClass}
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={commentId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
              Your review
            </label>
            <textarea
              id={commentId}
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What has it been like to live with?"
              aria-invalid={Boolean(errors.comment)}
              className={cn(fieldClass, "resize-y")}
            />
            {errors.comment ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.comment}</p>
            ) : (
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                At least 20 characters. Posting as {user.name}.
              </p>
            )}
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className={buttonStyles()}>
            {submitting ? "Saving…" : mine ? "Update review" : "Post review"}
          </button>
        </form>
      ) : (
        <div className="card-surface mt-6 p-5">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Sign in to write a review.
          </p>
          {/* `next` returns them to this exact product afterwards. */}
          <Link
            href={`/auth/login?next=${encodeURIComponent(pathname)}`}
            className={buttonStyles({ variant: "outline", className: "mt-3" })}
          >
            Sign in
          </Link>
        </div>
      )}
    </section>
  );
}
