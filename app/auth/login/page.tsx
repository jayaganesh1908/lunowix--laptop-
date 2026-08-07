import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ENABLED_OAUTH_PROVIDERS } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to sync your Lunowix wishlist and comparison history.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
          Sign in to pick up your wishlist and comparisons where you left them.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <AuthForm mode="login" providers={ENABLED_OAUTH_PROVIDERS} next={next} />
    </>
  );
}
