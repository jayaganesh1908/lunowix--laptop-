"use client";

import { createContext, useContext } from "react";
import type { ProfileRow } from "@/lib/types/database";

export interface SessionAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: ProfileRow["role"];
  joinedAt: string;
}

export interface SessionContextValue {
  account: SessionAccount | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** False until the browser client has confirmed the session. */
  hydrated: boolean;
}

export const SessionContext = createContext<SessionContextValue>({
  account: null,
  isAuthenticated: false,
  isAdmin: false,
  hydrated: false,
});

/**
 * Read-only view of the signed-in user.
 *
 * Sign-in and sign-out are server actions in `app/auth/actions.ts` — they have
 * to run on the server so the session cookie is httpOnly, which means it cannot
 * be written from here.
 */
export function useAuth() {
  return useContext(SessionContext);
}
