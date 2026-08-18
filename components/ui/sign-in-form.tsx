"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeClosed, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * The sign-in form itself, with no surface of its own.
 *
 * It was extracted out of `sign-in-card-2` when the login page moved to a split
 * layout: the card's chrome — surface, tilt, cursor glow — is right when the
 * form floats on a page and wrong when it already sits on a panel. Rather than
 * a second copy of eight fields and their validation, both spellings render
 * this. `SignInCard` is now this form inside that chrome.
 *
 * FRONT END ONLY. `onSubmit` runs a timer and resolves — there is no auth
 * backend since Supabase was removed, and no credential is transmitted
 * anywhere. Wire `onSubmit` before shipping this as a login.
 */

type FieldName = "email" | "password" | null;

export interface SignInFormProps {
  onSubmit?: (values: { email: string; password: string; remember: boolean }) => void;
  className?: string;
}

const PROVIDERS = [
  {
    id: "google",
    label: "Google",
    // Brand glyphs as inline paths: no network fetch, and they inherit size.
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.9 5.9 0 0 1 0-11.8c1.68 0 2.8.72 3.45 1.33l2.35-2.27A9 9 0 1 0 12 21c5.2 0 8.63-3.65 8.63-8.8 0-.6-.06-1.04-.13-1.5Z"
        />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"
        />
      </svg>
    ),
  },
];

export function SignInForm({ onSubmit, className }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<FieldName>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const fieldClass =
    "h-10 w-full rounded-xl border border-ink-200 bg-white/70 pl-10 pr-10 text-sm outline-none transition " +
    "placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 " +
    "dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setIsLoading(true);
        onSubmit?.({ email, password, remember: rememberMe });
        window.setTimeout(() => setIsLoading(false), 1200);
      }}
      className={cn("space-y-4", className)}
    >
      <div className="space-y-3">
        <div className="relative">
          <Mail
            className={cn(
              "absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 transition-colors",
              focusedInput === "email" ? "text-brand-600 dark:text-brand-400" : "text-ink-400",
            )}
            aria-hidden
          />
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={() => setFocusedInput("email")}
            onBlur={() => setFocusedInput(null)}
            className={fieldClass}
          />
        </div>

        <div className="relative">
          <Lock
            className={cn(
              "absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 transition-colors",
              focusedInput === "password" ? "text-brand-600 dark:text-brand-400" : "text-ink-400",
            )}
            aria-hidden
          />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
            className={fieldClass}
          />
          {/* A button, not upstream's clickable div: this has to be reachable
              by keyboard and announce its state. */}
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-ink-400 transition hover:text-brand-600 dark:hover:text-brand-400"
          >
            {showPassword ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeClosed className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={() => setRememberMe((value) => !value)}
            className="size-4 rounded border-ink-200 accent-brand-500 dark:border-white/20"
          />
          Remember me
        </label>
        <Link
          href="/auth/forgot-password"
          className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group/button relative mt-5 flex h-10 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 text-sm font-semibold text-ink-950 transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
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
              Sign in
              <ArrowRight
                className="size-3.5 transition-transform group-hover/button:translate-x-1"
                aria-hidden
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div className="relative my-4 flex items-center">
        <div className="flex-grow border-t border-ink-200 dark:border-white/10" />
        <span className="mx-3 text-xs text-ink-400">or</span>
        <div className="flex-grow border-t border-ink-200 dark:border-white/10" />
      </div>

      {/* Google, GitHub and Facebook — all three, per the brief. */}
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            aria-label={`Continue with ${provider.label}`}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white/70 text-xs font-semibold text-ink-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-white/15 dark:bg-ink-950/60 dark:text-ink-200 dark:hover:text-brand-400"
          >
            {provider.icon}
            <span className="hidden sm:inline">{provider.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-ink-500 dark:text-ink-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
