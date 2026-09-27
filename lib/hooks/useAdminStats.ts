"use client";

import { useEffect, useState } from "react";

/** Mirrors `AdminStats` in `lib/server/stats.ts`, which is `server-only`. */
export interface AdminStatsData {
  users: { total: number; admins: number; newThisWeek: number };
  catalogue: { total: number; laptops: number; phones: number; headphones: number };
  engagement: {
    wishlistSaves: number;
    comparisons: number;
    reviews: number;
    subscribers: number;
    liveViews: number;
  };
  topProducts: {
    id: string;
    name: string;
    category: string;
    href: string;
    views: number;
    liveViews: number;
    rating: number;
  }[];
  recentReviews: {
    id: string;
    productId: string;
    productName: string;
    author: string;
    rating: number;
    title: string;
    date: string;
  }[];
}

export type AdminStatsState =
  | { status: "loading" }
  | { status: "ready"; data: AdminStatsData }
  /** Signed out, or signed in without the admin role. */
  | { status: "denied"; reason: "unauthenticated" | "forbidden" }
  | { status: "error"; message: string };

/**
 * Fetches the dashboard figures.
 *
 * `denied` is kept distinct from `error` because the page says different things:
 * one offers a sign-in link, the other an apology. Folding both into "failed"
 * would show a member of the public a retry button for something retrying cannot
 * fix.
 */
export function useAdminStats(): AdminStatsState {
  const [state, setState] = useState<AdminStatsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/stats", { cache: "no-store" });
        if (cancelled) return;

        if (response.status === 401) {
          setState({ status: "denied", reason: "unauthenticated" });
          return;
        }
        if (response.status === 403) {
          setState({ status: "denied", reason: "forbidden" });
          return;
        }
        if (!response.ok) {
          setState({ status: "error", message: "The dashboard figures could not be loaded." });
          return;
        }

        setState({ status: "ready", data: (await response.json()) as AdminStatsData });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Could not reach the server." });
        }
      }
    })();

    // Guards against setting state after unmount, which React warns about and
    // which would also overwrite a later, fresher result.
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
