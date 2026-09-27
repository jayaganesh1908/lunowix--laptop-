import "server-only";

import { FileStore } from "./file";
import { PostgresStore } from "./postgres";
import { type Store } from "./types";

export { type Collection, type Doc, type Store, type Where } from "./types";

/**
 * Picks the adapter and keeps one instance for the process.
 *
 * `DATABASE_URL` set   -> Postgres. Any provider; every free tier works.
 * `DATABASE_URL` unset -> the JSON file store, so a fresh clone runs with no
 *                         setup at all.
 *
 * Both are imported statically. `pg` creates nothing until a pool is asked for,
 * so importing the module in a deployment that never sets `DATABASE_URL` costs
 * a module load and opens no sockets.
 */

let instance: Store | null = null;
let warned = false;

/**
 * Refuses to hand back the file store where it cannot work.
 *
 * Serverless platforms give each invocation a fresh, mostly read-only
 * filesystem: a registration would succeed, return 201, and be gone by the next
 * request. That failure is silent and looks like a bug in the app, so it is
 * better to fail loudly on the first query with the fix in the message.
 *
 * `LUNOWIX_ALLOW_FILE_STORE=1` overrides it, for a container or VM with a real
 * mounted disk where the file store is a deliberate single-process choice.
 */
function assertFileStoreIsUsable() {
  if (process.env.LUNOWIX_ALLOW_FILE_STORE === "1") return;

  const serverless = Boolean(
    process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
  if (!serverless) return;

  throw new Error(
    "No DATABASE_URL is set, and this platform's filesystem does not persist " +
      "between requests — accounts, wishlists and reviews would be lost " +
      "immediately. Set DATABASE_URL to a Postgres connection string (Neon, " +
      "Supabase, Railway and Render all have a free tier). If you really do " +
      "have a persistent disk here, set LUNOWIX_ALLOW_FILE_STORE=1.",
  );
}

export function getStore(): Store {
  if (instance) return instance;

  if (process.env.DATABASE_URL) {
    instance = new PostgresStore();
    return instance;
  }

  assertFileStoreIsUsable();

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[lunowix] Running on the JSON file store in production. Data lives on " +
        "this machine's disk and is not shared between instances. Set " +
        "DATABASE_URL for anything multi-instance.",
    );
  }

  instance = new FileStore();
  return instance;
}

/** Which adapter is live. Surfaced on `/api/health` so a deploy can be checked. */
export function storeKind(): "postgres" | "file" {
  return process.env.DATABASE_URL ? "postgres" : "file";
}

/** Test seam: drops the cached instance so the next `getStore` re-reads env. */
export function resetStoreForTests() {
  instance = null;
  warned = false;
}
