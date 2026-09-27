"use client";

import { SessionProvider } from "./SessionProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

/**
 * `SessionProvider` sits INSIDE `ToastProvider` so the session can raise a
 * toast — "signed out", "your session expired" — and outside nothing else,
 * because everything below it may ask who is signed in.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionProvider>{children}</SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
