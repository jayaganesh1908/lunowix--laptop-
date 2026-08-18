import type { Metadata } from "next";
import Link from "next/link";
import { LunowixMark } from "@/components/common/LunowixMark";
import { buttonStyles } from "@/components/common/buttonStyles";

export const metadata: Metadata = {
  title: "Reset your password",
};

/**
 * Placeholder, so the sign-in card's "Forgot password?" link resolves.
 *
 * A reset flow is nothing but its backend — it has to send mail and mint a
 * one-time token. Showing an email field that goes nowhere would tell someone
 * a reset is on its way when none is.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <LunowixMark className="h-12 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Password reset isn&apos;t live</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        There is no account system yet, so there is nothing to reset. Your
        wishlist and comparisons are saved in this browser and need no password.
      </p>
      <div className="mt-8">
        <Link href="/auth/login" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
