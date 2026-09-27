"use client";

import { createContext, useContext } from "react";

/**
 * The signed-in account, as the client sees it.
 *
 * Mirrors `PublicUser` on the server. Declared here rather than imported from
 * `lib/server/repo/users` on purpose: that module is `server-only`, and pulling
 * it into a client component is a build error.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "member" | "editor" | "admin";
  createdAt: string;
}

export interface AuthResult {
  ok: boolean;
  /** A sentence ready to show. Absent when `ok`. */
  error?: string;
  /** Field-level messages, keyed by field name, when the server sent them. */
  fieldErrors?: Record<string, string>;
}

export interface SessionValue {
  user: SessionUser | null;
  /** True until the first `/api/auth/session` answer lands. */
  loading: boolean;
  signIn: (input: {
    email: string;
    password: string;
    remember?: boolean;
  }) => Promise<AuthResult>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Re-reads the session. For after something changes it server-side. */
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

/**
 * Safe outside the provider, returning a signed-out value whose actions report
 * a failure rather than throwing. Components stay portable, and a page that
 * renders outside `AppProviders` degrades to "nobody is signed in" instead of
 * crashing.
 */
export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (context) return context;

  const unavailable = async (): Promise<AuthResult> => ({
    ok: false,
    error: "Accounts are unavailable on this page.",
  });

  return {
    user: null,
    loading: false,
    signIn: unavailable,
    signUp: unavailable,
    signOut: async () => undefined,
    refresh: async () => undefined,
  };
}
