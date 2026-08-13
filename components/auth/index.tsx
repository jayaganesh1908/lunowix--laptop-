"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/common";
import {
  signInWithMagicLink,
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
  type AuthState,
} from "@/app/auth/actions";
import { cn } from "@/lib/utils";

/** Brand marks for the OAuth providers, inlined as single-file SVGs. */
type IconProps = React.SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

/** Google keeps its four brand colours — a monochrome G is off-guidelines. */
export function GoogleMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GithubMark(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

export function DiscordMark(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M19.54 5.34A16.1 16.1 0 0 0 15.55 4.1l-.2.37a13.9 13.9 0 0 1 3.5 1.4 12.6 12.6 0 0 0-10.7 0 13.9 13.9 0 0 1 3.5-1.4l-.2-.37A16.1 16.1 0 0 0 4.46 5.34C1.9 9.1 1.2 12.77 1.55 16.38a16.2 16.2 0 0 0 4.9 2.47l.98-1.37a10.6 10.6 0 0 1-1.66-.8l.41-.3a11.6 11.6 0 0 0 9.64 0l.41.3c-.53.32-1.08.58-1.66.8l.98 1.37a16.2 16.2 0 0 0 4.9-2.47c.42-4.2-.7-7.83-2.91-11.04ZM8.52 14.25c-.95 0-1.74-.87-1.74-1.94s.77-1.95 1.74-1.95c.98 0 1.76.88 1.74 1.95 0 1.07-.77 1.94-1.74 1.94Zm6.96 0c-.95 0-1.73-.87-1.73-1.94s.77-1.95 1.73-1.95c.98 0 1.76.88 1.74 1.95 0 1.07-.76 1.94-1.74 1.94Z" />
    </svg>
  );
}

export function GitlabMark(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M12 21.5 8.2 9.8h7.6L12 21.5Zm-9.7-11.7h4.3L12 21.5 2.3 9.8Zm19.4 0L12 21.5l5.4-11.7h4.3ZM6.6 2.5l1.6 7.3H2.3L6.6 2.5Zm10.8 0 4.3 7.3h-5.9l1.6-7.3Z" />
    </svg>
  );
}

export function AppleMark(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M16.36 12.72c.02 2.6 2.28 3.46 2.3 3.47-.02.06-.36 1.25-1.2 2.47-.72 1.06-1.47 2.11-2.66 2.13-1.16.02-1.54-.69-2.87-.69-1.33 0-1.75.67-2.85.71-1.14.05-2.01-1.14-2.74-2.19-1.49-2.16-2.63-6.1-1.1-8.76.76-1.32 2.12-2.16 3.6-2.18 1.12-.02 2.18.75 2.87.75.68 0 1.97-.93 3.32-.79.57.02 2.16.23 3.18 1.72-.08.05-1.9 1.11-1.88 3.32M14.2 4.6c.61-.74 1.02-1.77.9-2.8-.88.04-1.94.59-2.57 1.32-.56.66-1.05 1.71-.92 2.72.98.07 1.98-.5 2.59-1.24" />
    </svg>
  );
}

const PROVIDERS: Record<
  string,
  { label: string; Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement }
> = {
  google: { label: "Google", Icon: GoogleMark },
  github: { label: "GitHub", Icon: GithubMark },
  discord: { label: "Discord", Icon: DiscordMark },
  gitlab: { label: "GitLab", Icon: GitlabMark },
  apple: { label: "Apple", Icon: AppleMark },
};

function ProviderButton({
  provider,
  label,
  Icon,
  soloRow,
}: {
  provider: string;
  label: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  soloRow: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="provider"
      value={provider}
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border text-sm font-semibold transition",
        "border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50",
        "dark:border-white/15 dark:bg-ink-950/60 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="size-[18px]" />
      )}
      {soloRow ? `Continue with ${label}` : label}
    </button>
  );
}

export function OAuthButtons({
  providers,
  next,
}: {
  providers: string[];
  next?: string;
}) {
  const known = providers.filter((provider) => provider in PROVIDERS);
  if (known.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-2.5",
        known.length > 1 && "sm:grid-cols-2",
      )}
    >
      {known.map((provider) => (
        // One form per provider so `useFormStatus` reports the pending state of
        // the button that was actually clicked, not all of them at once.
        <form key={provider} action={signInWithProvider}>
          <input type="hidden" name="next" value={next ?? "/profile"} />
          <ProviderButton
            provider={provider}
            label={PROVIDERS[provider].label}
            Icon={PROVIDERS[provider].Icon}
            soloRow={known.length === 1}
          />
        </form>
      ))}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-ink-200 bg-white/80 pl-10 pr-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-ink-950/60 dark:placeholder:text-ink-500";

type Mode = "login" | "register";
type Method = "password" | "magic";

const initialState: AuthState = {};

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
