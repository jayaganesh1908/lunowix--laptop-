import { guarded, ok } from "@/lib/server/http";
import { configuredProviders } from "@/lib/server/auth/oauth";

/**
 * Which social sign-ins this deployment can actually perform.
 *
 * The form used to render all three buttons disabled with a hardcoded "not
 * configured" title, which was honest but fixed: enabling a provider could not
 * light its button up without a code change. Now the UI asks.
 *
 * Safe to be public — it returns ids and labels, never a client id and certainly
 * never a secret. Anyone can see which providers a sign-in page offers simply by
 * looking at it.
 */
export const dynamic = "force-dynamic";

export const GET = guarded(async () => ok({ providers: configuredProviders() }));
