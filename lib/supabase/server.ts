import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Supabase client bound to the request's cookies.
 *
 * Returns `null` when the project is not configured so callers can fall back to
 * the static catalogue rather than throwing during render.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the middleware
          // refreshes the session on every request, so the tokens written here
          // would be redundant anyway.
        }
      },
    },
  });
}

/**
 * The signed-in user, or `null`.
 *
 * Always `getUser()` rather than `getSession()` on the server — `getSession`
 * trusts whatever is in the cookie, while `getUser` revalidates it with the
 * auth server. Anything guarding access has to use the checked one.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/** The signed-in user's profile row, or `null`. */
export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}
