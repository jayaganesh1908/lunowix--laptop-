import { guarded, ok } from "@/lib/server/http";
import { getStore, storeKind } from "@/lib/server/store";
import { providerDiagnostics } from "@/lib/server/auth/oauth";
import { contactMailConfigured, resetMailConfigured, senderIsShared } from "@/lib/email/config";

/**
 * Liveness, and a check that the backend is wired to something that will work.
 *
 * It reports the things that are silently wrong on a misconfigured deploy:
 *
 *  - `store: "file"` on a real URL means no `DATABASE_URL`, so accounts live on
 *    one machine's disk and vanish on a serverless host.
 *  - `auth: false` means `AUTH_SECRET` is unset, and every sign-in and
 *    registration will fail with a 500 — which is what happens, because sessions
 *    cannot be signed. That failure otherwise only shows up as a generic error on
 *    the first person who tries to register, and the reason is buried in a log.
 *  - `mail.passwordReset: false` means password reset silently does nothing.
 *  - `oauth[].configured` and `oauth[].callback` are the two facts needed to fix a
 *    social sign-in, and neither is visible from outside.
 *
 * `status` covers only what breaks the CORE of the site: the store and session
 * signing. Mail and social sign-in are genuinely optional — a deployment with
 * neither is fully functional for registration, sign-in, wishlists and reviews —
 * so their absence is reported, not treated as degraded. Otherwise the one signal
 * an uptime monitor watches would be red on a perfectly good deployment, which is
 * how people learn to ignore it.
 *
 * On disclosure: booleans, adapter names, provider ids and a fixed public URL. No
 * secrets, no connection strings, no counts, no key prefixes. The callback URL is
 * already public — it appears on the provider's consent screen and in the address
 * bar mid-flow. Naming an unset variable to whoever asks is a small disclosure,
 * and a deployment where sign-in or password reset is broken for everyone is a
 * much larger problem than the hint: an operator has to be able to find this from
 * a smoke test rather than from a user complaint.
 */
export const dynamic = "force-dynamic";

/** Mirrors the requirement in `lib/server/auth/session.ts`. */
const authConfigured = () =>
  Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) ||
  process.env.NODE_ENV !== "production";

export const GET = guarded(async () => {
  const checks = {
    store: storeKind(),
    auth: authConfigured(),
    site: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || null,
    mail: {
      passwordReset: resetMailConfigured(),
      contactForm: contactMailConfigured(),
      /*
       * Only meaningful once a key is set. Reported as `true` on the default
       * sender because that configuration LOOKS healthy while delivering to
       * exactly one inbox — see `senderIsShared`.
       */
      sharedSender: resetMailConfigured() ? senderIsShared() : null,
    },
    oauth: providerDiagnostics(),
  };

  try {
    // `init` is idempotent, and on Postgres it is a real round trip — which is
    // the point: it proves the credentials work, not merely that the app booted.
    await getStore().init();
  } catch (error) {
    console.error("[lunowix] Health check failed to reach the store:", error);
    return ok({ status: "degraded", ...checks, reachable: false }, 503);
  }

  // Sessions being unsignable is not "up", even though every read-only page works.
  if (!checks.auth) {
    return ok({ status: "degraded", ...checks, reachable: true }, 503);
  }

  return ok({ status: "ok", ...checks, reachable: true });
});
