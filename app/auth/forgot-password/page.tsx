import type { Metadata } from "next";
import Link from "next/link";
import { LunowixMark } from "@/components/common/LunowixMark";
import { buttonStyles } from "@/components/common/buttonStyles";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
};

/**
 * Request a reset link.
 *
 * This page used to say "Password reset isn't live", which was true while there
 * was no account system. It is live now: the form posts to
 * `/api/auth/forgot-password`, which mints a single-use token, stores only its
 * hash, and emails the link through Resend.
 *
 * With `RESEND_API_KEY` unset the endpoint returns 501 and the form says so,
 * rather than claiming an email is on its way that nothing will send.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <LunowixMark className="h-12 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        Enter the address on your account and we will send a link to choose a new
        password.
      </p>

      <div className="mt-8 w-full">
        <ForgotPasswordForm />
      </div>

      <Link
        href="/auth/login"
        className={buttonStyles({ variant: "outline", size: "lg", className: "mt-6" })}
      >
        Back to sign in
      </Link>
    </div>
  );
}
