"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SessionContext, type SessionAccount } from "@/lib/hooks/useAuth";

/**
 * Publishes the signed-in user to client components.
 *
 * Seeded with `initialAccount` from the server so the first paint already knows
 * who is signed in — otherwise the navbar would flash its signed-out state on
 * every navigation.
 */
export function SessionProvider({
  initialAccount,
  children,
}: {
  initialAccount: SessionAccount | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<SessionAccount | null>(initialAccount);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured);

  // Keep in step when the server sends down a different user (sign-in, sign-out,
  // or a profile update that revalidated the layout).
  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setHydrated(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // The account object itself comes from the server (it carries the profile
      // row, which the client session does not). Refreshing the router re-runs
      // the layout and pushes a fresh `initialAccount` down.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const value = useMemo(
    () => ({
      account,
      isAuthenticated: Boolean(account),
      isAdmin: account?.role === "admin",
      hydrated,
    }),
    [account, hydrated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
