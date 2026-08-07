import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { maybeSendWelcome } from "@/lib/auth/welcome-once";
import { getSiteUrl } from "@/lib/auth/site-url";

/**
 * OAuth / magic-link landing point.
 *
 * Supabase redirects here with a `code`, which is exchanged for a session and
 * written into cookies. First time through, the welcome mail goes out.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  // Request-derived in development, configured in production — same rule the
  // OAuth redirectTo uses, so the round trip stays on one origin.
  const base = await getSiteUrl();

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/auth/login?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${base}/auth/login?error=Missing+authorisation+code`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${base}/auth/login?error=Auth+is+not+configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${base}/auth/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  await maybeSendWelcome();

  return NextResponse.redirect(`${base}${next.startsWith("/") ? next : `/${next}`}`);
}
