import type { Metadata } from "next";
import { LunowixMark } from "@/components/common/LunowixMark";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Lunowix account to sync your wishlist and comparisons.",
};

/**
 * Sign-up.
 *
 * This page used to say "Accounts aren't live yet", which was the honest thing
 * to show while there was no backend to persist a credential. There is one now:
 * `RegisterForm` posts to `/api/auth/register`, which hashes the password with
 * scrypt, stores the account, signs the visitor in, and carries whatever they
 * had already saved in this browser onto the new account.
 */
export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <LunowixMark className="h-12 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        Your wishlist and comparisons follow you to any device. Anything you have
        already saved in this browser comes with you.
      </p>
      <div className="mt-8 w-full">
        <RegisterForm />
      </div>
    </div>
  );
}
