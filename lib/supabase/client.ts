"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client, memoised.
 *
 * `createBrowserClient` is safe to call repeatedly, but a single instance keeps
 * one auth listener and one session refresh timer for the whole tab instead of
 * one per component that asks for a client.
 *
 * Returns `null` when the project is not configured, so callers can degrade
 * instead of crashing on a fresh clone.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
