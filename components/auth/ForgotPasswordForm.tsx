"use client";

import { useId, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { buttonStyles } from "@/components/common/buttonStyles";
import { checkEmail } from "@/lib/validation/rules";

/**
 * Requests a reset link.
 *
 * The success copy says "if an account exists" on purpose: the endpoint answers
 * identically for a registered and an unregistered address so it cannot be used
 * to discover who has an account, and the wording has to match that rather than
 * claim something the server did not confirm.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailId = useId();

  if (sent) {
    return (
      <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" aria-hidden />
          Check your inbox
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          If an account exists for {email.trim()}, a reset link is on its way. It
          works once and expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting) return;

        const emailError = checkEmail(email);
        if (emailError) {
          setError(emailError);
          return;
        }

        setError(null);
        setSubmitting(true);
        try {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            setError(body.error ?? "Could not send the reset link.");
            return;
          }

          setSent(true);
        } catch {
          setError("Could not reach the server. Check your connection.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="w-full space-y-4 text-left"
    >
      <div>
        <label htmlFor={emailId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(error)}
            className="h-11 w-full rounded-xl border border-ink-200 bg-white/70 pl-10 pr-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} className={buttonStyles({ className: "w-full" })}>
        {submitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
