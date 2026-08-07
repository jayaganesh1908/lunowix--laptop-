"use client";

import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { SessionProvider } from "./SessionProvider";
import type { SessionAccount } from "@/lib/hooks/useAuth";

export function AppProviders({
  initialAccount,
  children,
}: {
  initialAccount: SessionAccount | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider initialAccount={initialAccount}>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
