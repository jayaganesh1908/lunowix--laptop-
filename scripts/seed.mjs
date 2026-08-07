/**
 * Pushes the catalogue in `lib/data` into Supabase.
 *
 *   npm run seed
 *
 * Idempotent — every write is an upsert keyed on the primary key, so running it
 * again refreshes the rows rather than duplicating them. Safe to re-run after
 * editing the source data.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY: the catalogue tables are admin-write under
 * RLS, and a seed run has no signed-in user.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------ env loading ------------------------------ */

// Minimal .env.local reader so the script does not need dotenv as a dependency.
function loadEnv(file) {
  try {
    for (const line of readFileSync(resolve(root, file), "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* file is optional */
  }
}

loadEnv(".env.local");
loadEnv(".env");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "\nMissing credentials.\n\n" +
      "  NEXT_PUBLIC_SUPABASE_URL   " + (URL ? "ok" : "MISSING") + "\n" +
      "  SUPABASE_SERVICE_ROLE_KEY  " + (SERVICE_KEY ? "ok" : "MISSING") + "\n\n" +
      "Add them to .env.local (Supabase dashboard → Project Settings → API),\n" +
      "then run the migration in supabase/migrations/0001_init.sql and retry.\n",
  );
  process.exit(1);
}

/* --------------------------- load the TS catalogue ------------------------ */

/*
 * The catalogue lives in TypeScript, so this script is run *through* tsx
 * (`npm run seed` → `tsx scripts/seed.mjs`) rather than registering a loader at
 * runtime. Registering mid-flight is fragile across Node versions; letting the
 * runner handle it means the import below just works.
 */
let laptops, games, softwareCatalog;
try {
  ({ laptops } = await import("../lib/data/laptops.ts"));
  ({ games } = await import("../lib/data/games.ts"));
  ({ softwareCatalog } = await import("../lib/data/software.ts"));
} catch (error) {
  console.error(
    "\nCould not load the TypeScript catalogue.\n\n" +
      "Run it via the npm script so tsx handles the .ts imports:\n\n" +
      "  npm run seed\n\n" +
      `Underlying error: ${error.message}\n`,
  );
  process.exit(1);
}

/* --------------------------------- seed ---------------------------------- */

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows, conflict) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
  if (error) {
    console.error(`\n✗ ${table}: ${error.message}\n`);
    process.exit(1);
  }
  console.log(`  ✓ ${table.padEnd(16)} ${rows.length} rows`);
}

console.log("\nSeeding Supabase…\n");

await upsert(
  "games",
  games.map((game, index) => ({
    id: game.id,
    name: game.name,
    genre: game.genre,
    release_year: game.releaseYear,
    icon: game.icon,
    demand: game.demand,
    cpu_bound: game.cpuBound,
    sort_order: index,
  })),
  "id",
);

await upsert(
  "software",
  softwareCatalog.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    vendor: entry.vendor,
    icon: entry.icon,
    req_cpu: entry.requirement.cpu,
    req_gpu: entry.requirement.gpu,
    req_ram: entry.requirement.ram,
    sort_order: index,
  })),
  "id",
);

await upsert(
  "laptops",
  laptops.map((laptop) => ({
    id: laptop.id,
    name: laptop.name,
    brand: laptop.brand,
    price: laptop.price,
    mrp: laptop.mrp,
    summary: laptop.summary,
    specs: laptop.specs,
    performance: laptop.performance,
    image: laptop.image,
    images: laptop.images,
    rating: laptop.rating,
    reviews_count: laptop.reviews,
    bestseller: laptop.bestseller,
    release_year: laptop.releaseYear,
    views: laptop.views,
    tags: laptop.tags,
    affiliate_url: laptop.affiliateUrl,
    in_stock: laptop.inStock,
  })),
  "id",
);

// Benchmarks and compatibility are derived, so they are rebuilt wholesale
// rather than merged — a changed model should not leave stale rows behind.
const softwareIdByName = new Map(softwareCatalog.map((entry) => [entry.name, entry.id]));

await upsert(
  "laptop_games",
  laptops.flatMap((laptop) =>
    laptop.games.map((game) => ({
      laptop_id: laptop.id,
      game_id: game.id,
      fps: game.fps,
      graphics: game.graphics,
      tier: game.tier,
    })),
  ),
  "laptop_id,game_id",
);

await upsert(
  "laptop_software",
  laptops.flatMap((laptop) =>
    Object.entries(laptop.software)
      .map(([name, status]) => {
        const softwareId = softwareIdByName.get(name);
        return softwareId
          ? { laptop_id: laptop.id, software_id: softwareId, status }
          : null;
      })
      .filter(Boolean),
  ),
  "laptop_id,software_id",
);

/*
 * Demo reviews are inserted with a null author_id — they predate any real
 * account. Deleted first so re-running does not stack duplicates, since their
 * ids are generated rather than stable.
 */
await supabase.from("reviews").delete().is("author_id", null);

await upsert(
  "reviews",
  laptops.flatMap((laptop) =>
    laptop.reviewList.map((review) => ({
      laptop_id: laptop.id,
      author_id: null,
      author_name: review.author,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verified: review.verified,
      created_at: new Date(review.date).toISOString(),
    })),
  ),
  "id",
);

console.log(
  `\nDone. ${laptops.length} laptops, ${games.length} games, ` +
    `${softwareCatalog.length} apps.\n`,
);
