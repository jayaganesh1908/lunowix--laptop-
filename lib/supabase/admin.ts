import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  hasServiceRole,
  isSupabaseConfigured,
} from "./env";

/**
 * Service-role client. **Bypasses every RLS policy.**
 *
 * `import "server-only"` above makes importing this from a client component a
 * build error rather than a leaked key.
 *
 * Only for work that legitimately has no user context: the seed script, and
 * stamping `welcome_email_sent_at` during the auth callback.
 */
export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured || !hasServiceRole) return null;

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
