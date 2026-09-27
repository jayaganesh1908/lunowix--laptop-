"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { buttonStyles } from "@/components/common/buttonStyles";
import { useSession } from "@/lib/hooks/useSession";
import { useToast } from "@/components/providers/ToastProvider";
import { checkPassword } from "@/lib/validation/rules";

/**
 * Sets a new password from an emailed token.
 *
 * The token is read from the query string, never stored and never rendered into
 * the page's visible text — it is a live credential for the account until it is
 * used.
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const { toast } = useToast();

  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordId = useId();
  const confirmId = useId();

  if (!token) {
    return (
      <div className="w-full rounded-2xl border border-ink-200 p-5 text-left dark:border-white/10">
        <p className="text-sm font-semibold">This link is incomplete</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          It is missing its reset token. Request a fresh link and open the one in
          the newest email.
        </p>
        <Link href="/auth/forgot-password" className={buttonStyles({ variant: "outline", className: "mt-4" })}>
          Request a new link
        </Link>
      </div>
    );
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-ink-200 bg-white/70 pl-10 pr-3 text-sm outline-none transition " +
    "placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 " +
    "dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting) return;

        const passwordError = checkPassword(password);
        if (passwordError) {
          setError(passwordError);
          return;
        }
        // Checked here only: the server has no business receiving a confirmation
        // field, and a mismatch is a typo, not a policy violation.
        if (password !== confirm) {
          setError("Those two passwords do not match.");
          return;
        }

        setError(null);
        setSubmitting(true);
        try {
          const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token, password }),
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            setError(body.error ?? "Could not reset the password.");
            return;
          }

          // The route signs this browser back in, so re-read the session.
          await refresh();
          toast("Password changed. You're signed in.");
          router.replace("/wishlist");
        } catch {
          setError("Could not reach the server. Check your connection.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="w-full space-y-4 text-left"
    >
      <div>
        <label htmlFor={passwordId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
          New password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor={confirmId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
          Confirm it
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            id={confirmId}
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="Type it again"
            className={fieldClass}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} className={buttonStyles({ className: "w-full" })}>
        {submitting ? "Saving…" : "Set new password"}
      </button>

      <p className="text-xs text-ink-500 dark:text-ink-400">
        Changing your password signs out every other device.
      </p>
    </form>
  );
}
