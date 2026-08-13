"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { OAuthButtons } from "./OAuthButtons";
import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from "@/app/auth/actions";
import { cn } from "@/lib/utils/cn";

type Mode = "login" | "register";
type Method = "password" | "magic";

const initialState: AuthState = {};

const inputClass =
  "h-11 w-full rounded-xl border border-ink-200 bg-white/80 pl-10 pr-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

export function AuthForm({
  mode,
  providers,
  next,
}: {
  mode: Mode;
  providers: string[];
  next?: string;
}) {
  const ids = { name: useId(), email: useId(), password: useId() };
  const [method, setMethod] = useState<Method>("password");
  const [showPassword, setShowPassword] = useState(false);

  const action =
    mode === "register"
      ? signUpWithPassword
      : method === "magic"
        ? signInWithMagicLink
        : signInWithPassword;

  // Keyed per mode+method so switching tabs clears the previous result.
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-5">
      <OAuthButtons providers={providers} next={next} />

      {providers.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
          <span className="text-xs font-medium uppercase tracking-widest text-ink-500 dark:text-ink-400">
            or
          </span>
          <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
        </div>
      ) : null}

      {mode === "login" ? (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-950/60"
        >
          {(
            [
              ["password", "Password"],
              ["magic", "Magic link"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={method === value}
              onClick={() => setMethod(value)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition",
                method === value
                  ? "bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white"
                  : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/profile"} />

        {mode === "register" ? (
          <Field id={ids.name} label="Full name" icon={<User className="size-4" aria-hidden />}>
            <input
              id={ids.name}
              name="fullName"
              placeholder="Priya Nair"
              autoComplete="name"
              required
              className={inputClass}
            />
          </Field>
        ) : null}

        <Field id={ids.email} label="Email address" icon={<Mail className="size-4" aria-hidden />}>
          <input
            id={ids.email}
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={inputClass}
          />
        </Field>

        {method === "password" || mode === "register" ? (
          <Field
            id={ids.password}
            label="Password"
            icon={<Lock className="size-4" aria-hidden />}
            action={
              mode === "login" ? (
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
                >
                  Forgot password?
                </Link>
              ) : null
            }
          >
            <input
              id={ids.password}
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </Field>
        ) : (
          <p className="flex items-start gap-2 rounded-xl border border-brand-500/25 bg-brand-500/5 px-3.5 py-3 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" aria-hidden />
            We will email you a one-time link. No password needed.
          </p>
        )}

        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-700 dark:text-rose-300"
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
          {mode === "register"
            ? "Create account"
            : method === "magic"
              ? "Email me a link"
              : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-600 dark:text-ink-300">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Lunowix?{" "}
            <Link href="/auth/register" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
