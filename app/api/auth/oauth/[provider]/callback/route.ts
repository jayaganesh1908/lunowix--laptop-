import { NextResponse } from "next/server";
import { guarded } from "@/lib/server/http";
import {
  exchangeCodeForProfile,
  isConfigured,
  isProviderId,
  readState,
} from "@/lib/server/auth/oauth";
import { linkOrCreate } from "@/lib/server/repo/identities";
import { createSession } from "@/lib/server/repo/sessions";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth/session";

/**
 * Completes a provider sign-in.
 *
 * Every failure ends as a redirect back to `/auth/login?error=…`, never as JSON
 * and never as a stack trace. Someone arriving here has a browser open, not a
 * terminal, and the provider's own error strings are not written for them.
 */
export const dynamic = "force-dynamic";

const STATE_COOKIE = "lunowix_oauth_state";

interface Params {
  params: Promise<{ provider: string }>;
}

export const GET = guarded(async (request: Request, { params }: Params) => {
  const { provider } = await params;
  const url = new URL(request.url);

  const back = (error: string) => {
    const response = NextResponse.redirect(new URL(`/auth/login?error=${error}`, url.origin));
    // The flow is over either way; do not leave a usable state cookie behind.
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (!isProviderId(provider)) return back("unknown-provider");
  if (!isConfigured(provider)) return back("provider-not-configured");

  // The person pressed cancel on the consent screen. Not an error worth shouting about.
  if (url.searchParams.get("error")) return back("cancelled");

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || !returnedState) return back("bad-callback");

  /*
   * Both halves must agree: the signature proves we minted this state, and the
   * cookie proves this browser is the one that started the flow.
   */
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!cookieState || cookieState !== returnedState) return back("state-mismatch");

  const state = readState(returnedState);
  if (!state) return back("state-expired");

  let profile;
  try {
    profile = await exchangeCodeForProfile(provider, code, state.verifier);
  } catch (error) {
    // The detail belongs in the log, not in a query string on a public page.
    console.error(`[lunowix] ${provider} OAuth exchange failed:`, error);
    return back("exchange-failed");
  }

  const linked = await linkOrCreate(provider, profile);

  if (!linked.ok) {
    /*
     * Two honest refusals, each with its own message on the login page:
     *
     * `no-email` — the provider returned no address, so there is nothing to make
     * an account from. On Facebook this is what an unverified Meta app looks like.
     *
     * `email-unverified` — an account already holds this address and the provider
     * would not vouch for it. Linking anyway would hand over that account, so the
     * person is asked to sign in with their password instead.
     */
    return back(linked.reason);
  }

  const session = await createSession(linked.user.id, true);
  const response = NextResponse.redirect(new URL(state.next, url.origin));

  response.cookies.set(SESSION_COOKIE, session.cookieValue, cookieOptions(session.expiresAt));
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });

  return response;
});
