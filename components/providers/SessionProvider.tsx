"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SessionContext,
  type AuthResult,
  type SessionUser,
  type SessionValue,
} from "@/lib/hooks/useSession";
import { WISHLIST_STORAGE_KEY } from "@/lib/hooks/useWishlist";
import { COMPARE_HISTORY_KEY } from "@/lib/hooks/useCompare";

/**
 * Holds the signed-in account for the whole app, and owns the one place where
 * the browser's saved state is folded into an account.
 *
 * The merge happens HERE rather than inside `useWishlist` because it must happen
 * exactly once per sign-in. `useWishlist` is mounted by every product card on a
 * page — eighteen of them on a grid — and a merge in that hook would fire
 * eighteen times, each one racing the others through the same read-modify-write.
 */

/** Reads an array out of localStorage, tolerating absence and junk. */
function readLocalArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    /*
     * `useLocalStorage` subscribes to `storage` events, which fire for OTHER
     * tabs but never for the tab that wrote. Dispatching one by hand is what
     * makes the wishlist badge and board re-read after a merge, instead of
     * showing the pre-merge list until something else happens to re-render.
     */
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // Blocked or full storage. The server copy is authoritative regardless.
  }
}

interface ErrorBody {
  error?: string;
  issues?: { path: string; message: string }[];
}

/** Turns a failed response into something showable, including field messages. */
async function toAuthError(response: Response): Promise<AuthResult> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // A non-JSON error body (a proxy's HTML 502 page, say).
  }

  const fieldErrors = body.issues?.reduce<Record<string, string>>((all, issue) => {
    all[issue.path] ??= issue.message;
    return all;
  }, {});

  return {
    ok: false,
    error: body.error ?? "Something went wrong. Please try again.",
    fieldErrors,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Guards the one-time merge for a given account.
   *
   * Without it, any re-render that re-ran the effect would merge again. The
   * merge is idempotent, so a repeat is harmless — but it is also a pointless
   * request on every mount, and holding the id makes the intent explicit.
   */
  const mergedFor = useRef<string | null>(null);

  const adoptSavedState = useCallback(
    (wishlist: string[] | undefined, history: string[][] | undefined) => {
      if (wishlist) writeLocal(WISHLIST_STORAGE_KEY, wishlist);
      if (history) writeLocal(COMPARE_HISTORY_KEY, history);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const data = (await response.json()) as {
        user: SessionUser | null;
        wishlist?: string[];
        compareHistory?: string[][];
      };
      setUser(data.user);
      if (data.user) adoptSavedState(data.wishlist, data.compareHistory);
    } catch {
      // Offline, or the backend is down. Treat as signed out rather than
      // blocking the page — everything but the account still works.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [adoptSavedState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /*
   * Fold this browser's saved items into the account, once, after a session is
   * known. Covers the case the login route cannot: a session restored from a
   * cookie on a browser that saved things while signed out.
   */
  useEffect(() => {
    if (!user || mergedFor.current === user.id) return;
    mergedFor.current = user.id;

    const local = readLocalArray<string>(WISHLIST_STORAGE_KEY);
    if (local.length === 0) return;

    void (async () => {
      try {
        const response = await fetch("/api/wishlist/merge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productIds: local }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { productIds: string[] };
        adoptSavedState(data.productIds, undefined);
      } catch {
        // The local list is untouched, so nothing is lost — it will merge on
        // the next sign-in.
      }
    })();
  }, [user, adoptSavedState]);

  const signIn = useCallback<SessionValue["signIn"]>(
    async ({ email, password, remember = false }) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            remember,
            // Sent with the credential so one round trip both signs in and merges.
            wishlist: readLocalArray<string>(WISHLIST_STORAGE_KEY),
          }),
        });

        if (!response.ok) return toAuthError(response);

        const data = (await response.json()) as {
          user: SessionUser;
          wishlist: string[];
          compareHistory: string[][];
        };

        mergedFor.current = data.user.id;
        setUser(data.user);
        adoptSavedState(data.wishlist, data.compareHistory);
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not reach the server. Check your connection." };
      }
    },
    [adoptSavedState],
  );

  const signUp = useCallback<SessionValue["signUp"]>(
    async ({ name, email, password }) => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            wishlist: readLocalArray<string>(WISHLIST_STORAGE_KEY),
          }),
        });

        if (!response.ok) return toAuthError(response);

        const data = (await response.json()) as { user: SessionUser; wishlist: string[] };

        mergedFor.current = data.user.id;
        setUser(data.user);
        adoptSavedState(data.wishlist, undefined);
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not reach the server. Check your connection." };
      }
    },
    [adoptSavedState],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear locally regardless: the visitor asked to sign out, and a failed
      // request must not leave the UI claiming they are still signed in.
    }
    mergedFor.current = null;
    setUser(null);

    /*
     * The saved wishlist is deliberately LEFT in this browser.
     *
     * It is the signed-out wishlist too, and the account keeps its own copy
     * server-side. Clearing it would make signing out look like it deleted
     * someone's saved products.
     */
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
