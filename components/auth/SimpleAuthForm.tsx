"use client";

import { useActionState, useId } from "react";
import { AlertCircle, CheckCircle2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { AuthState } from "@/app/auth/actions";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "h-11 w-full rounded-xl border border-ink-200 bg-white/80 pl-10 pr-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-white/5 dark:placeholder:text-ink-500";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

/** Single-purpose form shared by the forgot-password and reset-password screens. */
export function SimpleAuthForm({
  action,
  submitLabel,
  fields,
}: {
  action: Action;
  submitLabel: string;
  fields: "email" | "password";
}) {
  const ids = { email: useId(), password: useId(), confirm: useId() };
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {fields === "email" ? (
        <div>
          <label htmlFor={ids.email} className="mb-1.5 block text-sm font-medium">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              id={ids.email}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor={ids.password} className="mb-1.5 block text-sm font-medium">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                id={ids.password}
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor={ids.confirm} className="mb-1.5 block text-sm font-medium">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                id={ids.confirm}
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {state.error ? (
        <p
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs leading-relaxed",
            "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
