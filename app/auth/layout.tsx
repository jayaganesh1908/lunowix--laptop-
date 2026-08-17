import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { AuthSplitCard } from "@/components/ui/login-1";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] size-[32rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[110px]" />
      </div>

      {/* Stays narrow until `lg`, where the split card's image half appears —
          below that the image is hidden, and a form alone at 56rem is far too
          wide to read. */}
      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-14 sm:px-6 sm:py-20 lg:max-w-4xl">
        <div className="flex justify-center">
          <Logo />
        </div>

        <AuthSplitCard className="mt-8">{children}</AuthSplitCard>

        {isSupabaseConfigured ? (
          <p className="mt-6 flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Sessions are stored in httpOnly cookies and your password is hashed by
              Supabase Auth — this app never sees it.
            </span>
          </p>
        ) : (
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs leading-relaxed text-yellow-900 dark:text-yellow-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Authentication is not configured. Add{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code className="font-mono">.env.local</code>, then restart the dev
              server. See <code className="font-mono">SETUP.md</code>.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
