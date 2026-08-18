import type { Metadata } from "next";
import Link from "next/link";
import { LunowixMark } from "@/components/common/LunowixMark";
import { buttonStyles } from "@/components/common/buttonStyles";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Lunowix account to sync your wishlist and comparisons.",
};

/**
 * Placeholder, so the sign-in card's "Create one" link resolves instead of 404ing.
 *
 * Sign-up needs a backend to mean anything — it has to persist a credential
 * somewhere — and there is no backend since Supabase was removed. A form that
 * looked real here would be worse than none: it would collect an email and a
 * password and silently drop them.
 */
export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <LunowixMark className="h-12 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Accounts aren&apos;t live yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        Wishlist and compare already work without one — both save to this browser,
        so you can use the whole catalogue right now.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/products" className={buttonStyles({ size: "lg" })}>
          Browse everything
        </Link>
        <Link href="/auth/login" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
