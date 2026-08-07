/**
 * Supabase configuration, read once and shared.
 *
 * Every reference to `process.env.NEXT_PUBLIC_*` is written out in full so
 * Next.js can inline it at build time — destructuring or dynamic lookup would
 * leave it undefined in the browser bundle.
 *
 * Nothing here throws when the values are missing. The app has to boot without
 * a backend so the catalogue can fall back to the static data in `lib/data`,
 * and so a fresh clone runs before anyone has created a Supabase project.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public credentials needed for auth and reads are present. */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Server-only. Bypasses RLS — never import this from a client component. */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasServiceRole = SUPABASE_SERVICE_ROLE_KEY.length > 0;

/**
 * OAuth providers to show on the sign-in screen.
 *
 * Driven by env rather than hard-coded: a button for a provider that has not
 * been enabled in the Supabase dashboard just throws on click, so the list has
 * to match what is actually configured.
 */
export const ENABLED_OAUTH_PROVIDERS = (
  process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "google,github"
)
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);
