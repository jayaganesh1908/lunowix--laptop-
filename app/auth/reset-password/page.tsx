import type { Metadata } from "next";
import { SimpleAuthForm } from "@/components/auth/SimpleAuthForm";
import { updatePassword } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from the emailed reset link, which lands on /auth/callback first —
 * that exchanges the code for a session, so `updateUser` here is authenticated.
 */
export default function ResetPasswordPage() {
  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
          At least 8 characters, including a number.
        </p>
      </header>

      <SimpleAuthForm
        action={updatePassword}
        fields="password"
        submitLabel="Save new password"
      />
    </>
  );
}
