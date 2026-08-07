import type { Metadata } from "next";
import Link from "next/link";
import { SimpleAuthForm } from "@/components/auth/SimpleAuthForm";
import { requestPasswordReset } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
          Enter your email and we will send a link to set a new one.
        </p>
      </header>

      <SimpleAuthForm
        action={requestPasswordReset}
        fields="email"
        submitLabel="Send reset link"
      />

      <p className="mt-5 text-center text-sm text-ink-600 dark:text-ink-300">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
