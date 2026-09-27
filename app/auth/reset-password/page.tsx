import type { Metadata } from "next";
import { Suspense } from "react";
import { LunowixMark } from "@/components/common/LunowixMark";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  /*
   * Kept out of search results. The URL carries a reset token, and an indexed
   * copy of one — in a search cache, a referrer header, an analytics log — is a
   * live credential sitting somewhere it was never meant to be.
   */
  robots: { index: false, follow: false },
};

/** Where an emailed reset link lands. */
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <LunowixMark className="h-12 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        Pick something you will remember. A long phrase beats a short password
        with symbols in it.
      </p>

      <div className="mt-8 w-full">
        {/* `useSearchParams` needs a Suspense boundary to keep the shell static. */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
