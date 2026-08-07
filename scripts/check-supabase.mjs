/**
 * Connectivity and schema check.
 *
 *   node scripts/check-supabase.mjs
 *
 * Reports what is reachable and what is missing, without ever printing a key.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  try {
    for (const line of readFileSync(resolve(root, file), "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tick = (ok) => (ok ? "OK  " : "FAIL");

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

console.log(`\nProject: ${url}\n`);

// 1. Is the project reachable at all?
try {
  const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
  console.log(`${tick(response.ok)} reachable            (auth health ${response.status})`);
} catch (error) {
  console.log(`FAIL reachable            ${error.message}`);
  console.log("\nCheck the Project URL is right and the project is not paused.\n");
  process.exit(1);
}

// 2. Does the publishable key authenticate?
const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  "profiles",
  "laptops",
  "games",
  "software",
  "laptop_games",
  "laptop_software",
  "reviews",
  "wishlists",
  "comparisons",
];

let missing = 0;
let counted = null;

for (const table of TABLES) {
  /*
   * Deliberately NOT `{ head: true }`. A HEAD request against a table that does
   * not exist comes back 204 with `error: null` and `count: null` — so a
   * head-only probe reports every missing table as healthy. Asking for a real
   * row surfaces the PGRST205 the table actually returns.
   */
  // `*`, not `id`: the junction tables have composite primary keys and no id
  // column, so selecting one would report a healthy table as broken.
  const { error } = await supabase.from(table).select("*").limit(1);

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) missing += 1;
    console.log(`${tick(false)} ${table.padEnd(20)} ${error.message.slice(0, 62)}`);
    continue;
  }

  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (table === "laptops") counted = count ?? 0;
  console.log(`${tick(true)} ${table.padEnd(20)} ${count ?? 0} rows`);
}

// 3. Does the secret key work (needed by the seed)?
if (secret) {
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from("laptops").select("*").limit(1);
  const keyOk = !error || !/invalid|jwt|api key/i.test(error.message);
  console.log(
    `${tick(keyOk)} secret key           ${keyOk ? "accepted" : error.message.slice(0, 60)}`,
  );
} else {
  console.log("--   secret key           not set (needed for npm run seed)");
}

console.log("");
if (missing > 0) {
  console.log(
    `${missing} of ${TABLES.length} tables missing — run supabase/migrations/0001_init.sql\n` +
      "in the Supabase SQL editor, then re-run this check.\n",
  );
} else if (!counted) {
  console.log("Schema is in place but empty. Run: npm run seed\n");
} else {
  console.log(`Everything is wired up. ${counted} laptops in Postgres.\n`);
}
