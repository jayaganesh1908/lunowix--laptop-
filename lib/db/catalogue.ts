import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { laptops as staticLaptops } from "@/lib/data/laptops";
import type { Brand, Laptop, Review } from "@/lib/types/laptop";
import type { GameBenchmark, GamePerformanceTier, GraphicsPreset } from "@/lib/types/game";
import type { CompatibilityStatus, SoftwareCompatibilityMap } from "@/lib/types/software";
import type { LaptopRow } from "@/lib/types/database";

const SELECT = `
  *,
  laptop_games ( fps, graphics, tier, games ( id, name, icon, sort_order ) ),
  laptop_software ( status, software ( id, name, sort_order ) )
`;

interface JoinedLaptop extends LaptopRow {
  laptop_games: {
    fps: number;
    graphics: GraphicsPreset;
    tier: GamePerformanceTier;
    games: { id: string; name: string; icon: string; sort_order: number } | null;
  }[];
  laptop_software: {
    status: CompatibilityStatus;
    software: { id: string; name: string; sort_order: number } | null;
  }[];
}

/** Maps a joined row onto the domain type the UI already speaks. */
function toLaptop(row: JoinedLaptop, reviewList: Review[] = []): Laptop {
  const games: GameBenchmark[] = (row.laptop_games ?? [])
    .filter((entry) => entry.games !== null)
    .sort((a, b) => a.games!.sort_order - b.games!.sort_order)
    .map((entry) => ({
      id: entry.games!.id,
      name: entry.games!.name,
      icon: entry.games!.icon,
      fps: entry.fps,
      graphics: entry.graphics,
      tier: entry.tier,
    }));

  const software: SoftwareCompatibilityMap = {};
  for (const entry of (row.laptop_software ?? [])
    .filter((item) => item.software !== null)
    .sort((a, b) => a.software!.sort_order - b.software!.sort_order)) {
    software[entry.software!.name] = entry.status;
  }

  return {
    id: row.id,
    name: row.name,
    brand: row.brand as Brand,
    price: row.price,
    mrp: row.mrp,
    summary: row.summary,
    specs: row.specs,
    performance: row.performance,
    games,
    software,
    image: row.image,
    images: row.images,
    // numeric() comes back as a string over the wire.
    rating: Number(row.rating),
    reviews: row.reviews_count,
    reviewList,
    bestseller: row.bestseller,
    releaseYear: row.release_year,
    views: row.views,
    tags: row.tags,
    affiliateUrl: row.affiliate_url ?? "#",
    inStock: row.in_stock,
  };
}

let warned = false;
function fallback(reason: string): Laptop[] {
  if (!warned) {
    warned = true;
    console.warn(
      `[lunowix] Serving the static catalogue (${reason}). ` +
        "Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and run " +
        "`npm run seed` to read from Postgres instead.",
    );
  }
  return staticLaptops;
}

/**
 * The whole catalogue.
 *
 * Falls back to the typed data in `lib/data` whenever Supabase is unconfigured,
 * unreachable, or empty — so the site still renders on a fresh clone and a
 * database outage degrades to stale content instead of a 500.
 *
 * `cache` dedupes this across a single render pass; page-level `revalidate`
 * controls how long the result is reused across requests.
 */
export const getLaptops = cache(async (): Promise<Laptop[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallback("no Supabase credentials");

  const { data, error } = await supabase.from("laptops").select(SELECT).order("price");

  if (error) return fallback(`query failed: ${error.message}`);
  if (!data || data.length === 0) return fallback("catalogue table is empty");

  return (data as unknown as JoinedLaptop[]).map((row) => toLaptop(row));
});

/** One laptop with its reviews, or `null` if the id is unknown. */
export const getLaptop = cache(async (id: string): Promise<Laptop | null> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return staticLaptops.find((laptop) => laptop.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("laptops")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return staticLaptops.find((laptop) => laptop.id === id) ?? null;
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("laptop_id", id)
    .order("created_at", { ascending: false })
    .limit(12);

  const reviewList: Review[] = (reviews ?? []).map((row) => ({
    id: row.id,
    author: row.author_name,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    date: row.created_at,
    verified: row.verified,
  }));

  return toLaptop(data as unknown as JoinedLaptop, reviewList);
});

/** Resolves a set of ids, preserving the order they were given in. */
export async function getLaptopsByIds(ids: string[]): Promise<Laptop[]> {
  if (ids.length === 0) return [];
  const all = await getLaptops();
  const byId = new Map(all.map((laptop) => [laptop.id, laptop]));
  return ids.map((id) => byId.get(id)).filter((laptop): laptop is Laptop => Boolean(laptop));
}

export interface ModerationReview extends Review {
  laptopId: string;
  laptopName: string;
}

/**
 * Newest reviews across the catalogue, for the admin moderation table.
 *
 * The laptop name is resolved from the cached catalogue rather than joined:
 * an embedded select would need the foreign-key relationships spelled out in
 * the hand-written `Database` type, and `getLaptops()` is already in the
 * request cache by the time this runs.
 */
export const getRecentReviews = cache(async (limit = 24): Promise<ModerationReview[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const names = new Map((await getLaptops()).map((laptop) => [laptop.id, laptop.name]));

  return data.map((row) => ({
    id: row.id,
    author: row.author_name,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    date: row.created_at,
    verified: row.verified,
    laptopId: row.laptop_id,
    laptopName: names.get(row.laptop_id) ?? row.laptop_id,
  }));
});
