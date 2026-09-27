import { NextResponse } from "next/server";
import { guarded } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import {
  authorizeUrl,
  createState,
  isConfigured,
  isProviderId,
} from "@/lib/server/auth/oauth";

/**
 * Begins a provider sign-in by redirecting to the provider's consent screen.
 *
 * A GET, because it is reached by a plain link from the sign-in form and ends in
 * a redirect off-site. That is safe here in a way it would not be for a state
 * change: nothing is written, and the callback — which does write — is protected
 * by the signed `state` this mints.
 */
export const dynamic = "force-dynamic";

/** Ten minutes, matching the state's own lifetime. */
const STATE_COOKIE = "lunowix_oauth_state";

interface Params {
  params: Promise<{ provider: string }>;
}

export const GET = guarded(async (request: Request, { params }: Params) => {
  const { provider } = await params;
  const url = new URL(request.url);

  /** Sends the visitor back to the form with a message rather than raw JSON. */
  const back = (error: string) =>
    NextResponse.redirect(new URL(`/auth/login?error=${error}`, url.origin));

  if (!isProviderId(provider)) return back("unknown-provider");
  if (!isConfigured(provider)) return back("provider-not-configured");

  const limit = rateLimit(clientKey(request, `oauth-start:${provider}`), 20, 15 * 60 * 1000);
  if (!limit.allowed) return back("rate-limited");

  /*
   * Where to land afterwards. Same rule as the login form: an absolute path on
   * this origin only. `?next=https://elsewhere` on a sign-in link is the classic
   * open redirect — the visitor authenticates and is handed to someone else's
   * page, primed to re-enter a credential.
   */
  const requested = url.searchParams.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/wishlist";

  const { state, verifier } = createState(next);
  const target = await authorizeUrl(provider, state, verifier);

  const response = NextResponse.redirect(target);

  /*
   * The state also goes in a cookie, and the callback requires BOTH to match.
   *
   * The signature alone proves this deployment minted the value; it does not
   * prove the browser completing the flow is the one that started it. Pinning it
   * to a cookie does, which is what stops a login-CSRF where someone is walked
   * through a flow that silently signs them into the attacker's account.
   */
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
});
