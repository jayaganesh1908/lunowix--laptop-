"use client";

import Image from "next/image";
import Link from "next/link";
import {
  GitCompareArrows,
  Heart,
  History,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { buttonStyles } from "@/components/common/buttonStyles";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/LoadingSkeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOut } from "@/app/auth/actions";
import { useCompare } from "@/lib/hooks/useCompare";
import { useWishlist } from "@/lib/hooks/useWishlist";
import { formatDate, formatPrice } from "@/lib/utils/formatters";

export function ProfilePanel() {
  const { account, hydrated } = useAuth();
  const wishlist = useWishlist();
  const compare = useCompare();

  if (!hydrated) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <EmptyState
        icon={<UserRound className="size-6" aria-hidden />}
        title="You are not signed in"
        description="Sign in with the demo account form to see your profile, wishlist and comparison history in one place."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/login" className={buttonStyles()}>
              Sign in
            </Link>
            <Link href="/auth/register" className={buttonStyles({ variant: "outline" })}>
              Create account
            </Link>
          </div>
        }
      />
    );
  }

  const initials = account.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      <section className="card-surface flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-ink-950"
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight">{account.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-300">
            <Mail className="size-3.5" aria-hidden />
            {account.email}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <ShieldCheck className="size-3.5" aria-hidden />
            Member since {formatDate(account.joinedAt)}
          </p>
        </div>

        {/* Sign-out is a server action: the session cookie is httpOnly, so it
            can only be cleared from the server. */}
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Log out
          </Button>
        </form>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Saved laptops", value: wishlist.count, href: "/wishlist" },
          { label: "In comparison", value: compare.count, href: "/compare" },
          { label: "Past comparisons", value: compare.history.length, href: "/compare" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card-surface p-5 transition hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]">
            <p className="font-mono text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{stat.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          <Heart className="size-4" aria-hidden />
          Your wishlist
        </h2>

        {wishlist.laptops.length === 0 ? (
          <p className="card-surface mt-4 p-6 text-sm text-ink-600 dark:text-ink-300">
            Nothing saved yet.{" "}
            <Link href="/laptops" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Browse the catalogue
            </Link>{" "}
            and tap the heart on anything you like.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.laptops.map((laptop) => (
              <li key={laptop.id}>
                <Link
                  href={`/laptops/${laptop.id}`}
                  className="card-surface flex items-center gap-3 p-3 transition hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]"
                >
                  <Image
                    src={laptop.image}
                    alt=""
                    width={72}
                    height={54}
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {laptop.name}
                    </span>
                    <span className="block font-mono text-xs tabular-nums text-ink-500 dark:text-ink-400">
                      {formatPrice(laptop.price)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          <History className="size-4" aria-hidden />
          Comparison history
        </h2>

        {compare.history.length === 0 ? (
          <p className="card-surface mt-4 p-6 text-sm text-ink-600 dark:text-ink-300">
            No comparisons yet.{" "}
            <Link href="/compare" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Put two laptops head to head
            </Link>{" "}
            and they will be listed here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {compare.history.map((pair) => (
              <li key={pair.map((item) => item.id).join("-")} className="card-surface p-4">
                <p className="text-sm font-semibold">{pair[0].name}</p>
                <p className="my-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  <GitCompareArrows className="size-3" aria-hidden />
                  vs
                </p>
                <p className="text-sm font-semibold">{pair[1].name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
