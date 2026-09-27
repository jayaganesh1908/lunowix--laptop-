import { guarded, ok } from "@/lib/server/http";
import { getStore, storeKind } from "@/lib/server/store";

/**
 * Liveness, and a check that the backend is wired to something that will work.
 *
 * It reports the two things that are silently wrong on a misconfigured deploy:
 *
 *  - `store: "file"` on a real URL means no `DATABASE_URL`, so accounts live on
 *    one machine's disk and vanish on a serverless host.
 *  - `auth: false` means `AUTH_SECRET` is unset, and every sign-in and
 *    registration will fail with a 500 — which is what happens, because sessions
 *    cannot be signed. That failure otherwise only shows up as a generic error on
 *    the first person who tries to register, and the reason is buried in a log.
 *
 * Booleans and adapter names only: no values, no versions, no connection
 * strings, no counts. Naming a missing variable to whoever asks is a small
 * disclosure, and a deployment where sign-in is broken for everyone is a much
 * larger problem than the hint — an operator needs to be able to find this from
 * a smoke test rather than from a user complaint.
 */
export const dynamic = "force-dynamic";

/** Mirrors the requirement in `lib/server/auth/session.ts`. */
const authConfigured = () =>
  Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) ||
  process.env.NODE_ENV !== "production";

export const GET = guarded(async () => {
  const checks = { store: storeKind(), auth: authConfigured() };

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
