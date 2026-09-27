"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useSession } from "@/lib/hooks/useSession";
import { useToast } from "@/components/providers/ToastProvider";
import { checkEmail, checkName, checkPassword } from "@/lib/validation/rules";

/**
 * Sign-up.
 *
 * Validated in the browser against the shared rules in `@/lib/validation/rules`,
 * which is where the bounds and the messages live for both sides. Deliberately
 * not the zod schemas: importing those into a client component pulls zod into
 * the browser bundle, which cost ~74 KB of first load on every page that did it.
 *
 * The server re-validates everything with zod regardless. This is here to save a
 * round trip, not to be the gate.
 */
export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const formErrorId = useId();

  const fieldClass =
    "h-11 w-full rounded-xl border border-ink-200 bg-white/70 pl-10 pr-3 text-sm outline-none transition " +
    "placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 " +
    "dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

  function validate() {
    const found: Record<string, string> = {};

    const nameError = checkName(name);
    if (nameError) found.name = nameError;

    const emailError = checkEmail(email);
    if (emailError) found.email = emailError;

    const passwordError = checkPassword(password);
    if (passwordError) found.password = passwordError;

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting) return;

        setFormError(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
          const result = await signUp({ name, email, password });
          if (result.ok) {
            toast("Account created. You're signed in.");
            router.replace("/wishlist");
            return;
          }
          // Field messages beside their fields; anything else at the top.
          if (result.fieldErrors) setErrors(result.fieldErrors);
          if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
            setFormError(result.error ?? "Could not create the account.");
          }
        } finally {
          setSubmitting(false);
        }
      }}
      className="w-full space-y-4 text-left"
    >
      <div>
        <label htmlFor={nameId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
          Your name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Jai"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className={fieldClass}
          />
        </div>
        {errors.name ? (
          <p id={`${nameId}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        ) : null}
      </div>

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
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            className={fieldClass}
          />
        </div>
        {errors.email ? (
          <p id={`${emailId}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={passwordId} className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
          Password
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
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${passwordId}-error` : `${passwordId}-hint`}
            className={fieldClass}
          />
        </div>
        {errors.password ? (
          <p id={`${passwordId}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.password}
          </p>
        ) : (
          <p id={`${passwordId}-hint`} className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            A long phrase you will remember beats a short one with symbols in it.
          </p>
        )}
      </div>

      {formError ? (
        <p
          id={formErrorId}
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="group/button relative flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 text-sm font-semibold text-ink-950 transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {submitting ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="size-4 animate-spin rounded-full border-2 border-ink-950/70 border-t-transparent"
            />
          ) : (
            <motion.span
              key="label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              Create account
              <ArrowRight
                className="size-3.5 transition-transform group-hover/button:translate-x-1"
                aria-hidden
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <p className="text-center text-xs text-ink-500 dark:text-ink-400">
        Already have one?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
