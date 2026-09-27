"use client";

import Link from "next/link";
import { Eye, Heart, Mail, MessageSquare, Users } from "lucide-react";
import { useAdminStats } from "@/lib/hooks/useAdminStats";
import { DashboardCard } from "./DashboardCard";
import { formatCompact, formatDate, formatNumber } from "@/lib/utils/formatters";
import { Rating } from "@/components/common/Rating";
import { buttonStyles } from "@/components/common/buttonStyles";

/**
 * The live half of the dashboard: figures from the database rather than from the
 * catalogue module.
 *
 * This is the part that used to be invented. `demoUsers` and `totalUsers = 4820`
 * were static seed arrays, so the dashboard reported 4,820 accounts on a site
 * with none. Everything here is a real count, and a fresh install honestly shows
 * zeros until someone signs up.
 *
 * The charts below it still come from `lib/data`, and should: the catalogue IS
 * the real product data.
 */
export function LiveStats() {
  const state = useAdminStats();

  if (state.status === "loading") {
    return (
      <div className="card-surface mt-5 p-6">
        <p className="text-sm text-ink-500 dark:text-ink-400">Loading live figures…</p>
      </div>
    );
  }

  if (state.status === "denied") {
    return (
      <div className="card-surface mt-5 p-6">
        <h3 className="text-base font-bold">
          {state.reason === "unauthenticated"
            ? "Sign in to see live figures"
            : "Your account cannot see live figures"}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          {state.reason === "unauthenticated"
            ? "Account numbers, saves and reviews come from the database and are only shown to an admin. The catalogue charts below need no account."
            : "This dashboard's live figures are limited to admin accounts. The first account created on a deployment becomes its admin."}
        </p>
        {state.reason === "unauthenticated" ? (
          <Link href="/auth/login?next=/admin" className={buttonStyles({ className: "mt-4" })}>
            Sign in
          </Link>
        ) : null}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="card-surface mt-5 p-6">
        <p className="text-sm text-ink-600 dark:text-ink-300">{state.message}</p>
      </div>
    );
  }

  const { users, engagement, topProducts, recentReviews } = state.data;

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard
          label="Accounts"
          value={formatNumber(users.total)}
          hint={`${users.admins} admin${users.admins === 1 ? "" : "s"}, ${users.newThisWeek} new this week`}
          icon={<Users className="size-5" aria-hidden />}
        />
        <DashboardCard
          label="Wishlist saves"
          value={formatNumber(engagement.wishlistSaves)}
          hint="Across every account"
          icon={<Heart className="size-5" aria-hidden />}
        />
        <DashboardCard
          label="Comparisons"
          value={formatNumber(engagement.comparisons)}
          hint="Stored in account history"
          icon={<MessageSquare className="size-5" aria-hidden />}
        />
        <DashboardCard
          label="Written reviews"
          value={formatNumber(engagement.reviews)}
          hint="From signed-in visitors"
          icon={<MessageSquare className="size-5" aria-hidden />}
        />
        <DashboardCard
          label="Subscribers"
          value={formatNumber(engagement.subscribers)}
          hint="Currently subscribed"
          icon={<Mail className="size-5" aria-hidden />}
        />
      </div>

      <div className="card-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-bold">Most viewed</h3>
          <p className="inline-flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <Eye className="size-3.5" aria-hidden />
            {formatCompact(engagement.liveViews)} views recorded here
          </p>
        </div>

        {/* Stating both numbers, because they mean different things: `views`
            includes each product's authored baseline, `liveViews` is only what
            this deployment has actually counted. Showing the total alone would
            look like traffic the site has not had. */}
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Ranked on the catalogue baseline plus views counted on this deployment.
        </p>

        <ul className="mt-4 space-y-2">
          {topProducts.map((product, index) => (
            <li key={product.id} className="flex items-center gap-3">
              <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-ink-400">
                {index + 1}
              </span>
              <Link
                href={product.href}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-600 dark:hover:text-brand-400"
              >
                {product.name}
              </Link>
              <span className="shrink-0 font-mono text-xs tabular-nums text-ink-500 dark:text-ink-400">
                {formatCompact(product.views)}
                {product.liveViews > 0 ? ` (+${product.liveViews})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-surface p-5">
        <h3 className="text-base font-bold">Latest written reviews</h3>
        {recentReviews.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
            Nobody has written a review yet. The samples on each product page are
            generated demo copy and are not counted here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentReviews.map((review) => (
              <li key={review.id} className="border-b border-ink-900/5 pb-3 last:border-b-0 last:pb-0 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{review.title}</p>
                  <Rating value={review.rating} />
                </div>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  {review.author} on {review.productName} · {formatDate(review.date)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
