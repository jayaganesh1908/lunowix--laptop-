import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/welcome";

/**
 * Sends the welcome mail exactly once per account.
 *
 * Called from both the OAuth/magic-link callback and the password sign-up
 * action, because which one fires depends on whether email confirmation is
 * switched on in the Supabase dashboard — with it off, sign-up returns a
 * session directly and the callback route is never reached.
 *
 * `welcome_email_sent_at` is the guard, so whichever path runs first wins and
 * the other becomes a no-op. Never throws: a failed send must not fail a login.
 */
export async function maybeSendWelcome(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, welcome_email_sent_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.welcome_email_sent_at) return;

    const name =
      profile.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      "";

    const sent = await sendWelcomeEmail(profile.email || user.email, name);
    if (!sent) return;

    // Prefer the service-role client: the account holder can update their own
    // profile row, so a user-scoped write here could be cleared to trigger
    // repeat sends. Falls back when no service key is configured.
    const writer = createSupabaseAdminClient() ?? supabase;
    await writer
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch (error) {
    console.error("[lunowix] maybeSendWelcome failed:", error);
  }
}
