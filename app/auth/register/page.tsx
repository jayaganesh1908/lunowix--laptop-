import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { ENABLED_OAUTH_PROVIDERS } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Lunowix account to keep your wishlist and comparisons.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
          Keep your shortlist, comparisons and price alerts in one place.
        </p>
      </header>

      <AuthForm mode="register" providers={ENABLED_OAUTH_PROVIDERS} next={next} />
    </>
  );
}
