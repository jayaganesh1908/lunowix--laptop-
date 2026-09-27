import "server-only";

import { allProducts, productCounts } from "@/lib/data/products";
import { countUsers, listUsers } from "./repo/users";
import { countWishlistRows } from "./repo/wishlist";
import { countComparisons } from "./repo/compare";
import { countReviews, recentReviews } from "./repo/reviews";
import { countSubscribers } from "./repo/newsletter";
import { totalViews, viewCounts } from "./repo/views";
import { productHref } from "@/lib/types";

/**
 * The numbers behind the admin dashboard.
 *
 * Real counts from the store, with one deliberate exception: `views` adds the
 * store's counters ON TOP of each product's hand-authored `views` seed from the
 * catalogue. Swapping to live-only would reset every ranking to zero on the day
 * this ships and make the "most viewed" table useless for weeks, so the seed
 * stays as a baseline and real traffic accumulates above it. `liveViews` is
 * reported separately so the dashboard can be honest about which is which.
 */

export interface AdminStats {
  users: { total: number; admins: number; newThisWeek: number };
  catalogue: { total: number } & Record<string, number>;
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

export async function collectStats(): Promise<AdminStats> {
  const [users, wishlistSaves, comparisons, reviews, subscribers, live, liveViews, latest] =
    await Promise.all([
      listUsers(),
      countWishlistRows(),
      countComparisons(),
      countReviews(),
      countSubscribers(),
      viewCounts(),
      totalViews(),
      recentReviews(6),
    ]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const topProducts = [...allProducts]
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      href: productHref(product),
      liveViews: live[product.id] ?? 0,
      views: product.views + (live[product.id] ?? 0),
      rating: product.rating,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    users: {
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      newThisWeek: users.filter((user) => Date.parse(user.createdAt) >= weekAgo).length,
    },
    catalogue: {
      total: allProducts.length,
      laptops: productCounts.laptop,
      phones: productCounts.phone,
      headphones: productCounts.headphone,
    },
    engagement: { wishlistSaves, comparisons, reviews, subscribers, liveViews },
    topProducts,
    recentReviews: latest.map((review) => ({
      id: review.id,
      productId: review.productId,
      productName:
        allProducts.find((product) => product.id === review.productId)?.name ??
        review.productId,
      author: review.author,
      rating: review.rating,
      title: review.title,
      date: review.createdAt.slice(0, 10),
    })),
  };
}

/** Total accounts, for surfaces that only need the one number. */
export async function userTotal() {
  return countUsers();
}
