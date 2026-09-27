"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useSession } from "@/lib/hooks/useSession";
import { useToast } from "@/components/providers/ToastProvider";
import { LaptopLoginLink } from "@/components/ui/laptop-login-button";
import { cn } from "@/lib/utils/cn";

/**
 * The navbar's account control: the login laptop when signed out, a menu when
 * signed in.
 *
 * While the session is still loading it renders the SIGNED-OUT control rather
 * than a skeleton. The session is one fetch on mount, so the flicker is brief,
 * and an empty gap where a control belongs reads as a broken header — whereas a
 * login link that turns into a menu reads as the page finishing loading.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { user, loading, signOut } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — table stakes for a popover.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading || !user) {
    return <LaptopLoginLink href="/auth/login" containerClassName={cn("hidden sm:inline-flex", className)} />;
  }

  /** First initial, for the avatar. Falls back to the email's. */
  const initial = (user.name.trim()[0] ?? user.email[0] ?? "?").toUpperCase();

  const itemClass =
    "flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5";

  return (
    <div ref={container} className={cn("relative hidden sm:block", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-brand-500/10 text-sm font-bold text-brand-700 transition hover:border-brand-400 dark:border-white/15 dark:text-brand-400"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="glass-strong absolute right-0 top-12 z-50 w-56 rounded-2xl border border-ink-200 p-2 shadow-[var(--shadow-lift)] dark:border-white/10"
        >
          <div className="border-b border-ink-900/5 px-3 pb-2 pt-1 dark:border-white/10">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user.email}</p>
          </div>

          <div className="pt-2">
            <Link href="/wishlist" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Heart className="size-4" aria-hidden />
              Wishlist
            </Link>

            {/* Only admins see the dashboard link. The route checks the role too —
                hiding a link is presentation, not access control. */}
            {user.role === "admin" ? (
              <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <LayoutDashboard className="size-4" aria-hidden />
                Admin
              </Link>
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await signOut();
                toast("Signed out. Your saved products stay in this browser.");
                router.push("/");
              }}
              className={cn(itemClass, "w-full text-left")}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The same control for the mobile drawer, which has room for full-width rows. */
export function AccountDrawerSection({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading, signOut } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  if (loading || !user) {
    return (
      <Link
        href="/auth/login"
        onClick={onNavigate}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 text-sm font-semibold text-ink-950"
      >
        <UserRound className="size-4" aria-hidden />
        Sign in
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          onNavigate?.();
          await signOut();
          toast("Signed out. Your saved products stay in this browser.");
          router.push("/");
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 transition hover:border-brand-400 dark:border-white/15 dark:text-ink-200"
      >
        <LogOut className="size-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
