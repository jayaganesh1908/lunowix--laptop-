"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitCompareArrows,
  Heart,
  LayoutDashboard,
  LogIn,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo, buttonStyles } from "@/components/common/Display";
import { SearchBar, ThemeToggle } from "@/components/common";
import { Particles } from "@/components/ui/particles";
import { useAuth, useCompare, useWishlist } from "@/lib/hooks";
import { categories } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Site-wide particle field.
 *
 * Fixed to the viewport rather than sized to the document: a canvas spanning a
 * long page would be enormous (and would need re-sizing every time content
 * height changed), whereas a viewport-sized layer stays behind the content the
 * whole way down for a fraction of the pixels.
 *
 * Sits at `-z-10`. `body`'s background propagates to the canvas, so a negative
 * z-index child still paints above it — but below every section, card and
 * surface in the app.
 */
export function BackgroundParticles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Particles
        className="h-full w-full"
        quantity={240}
        size={1.2}
        staticity={35}
        alphaRange={[0.35, 1]}
        color="#ff6b00"
      />
    </div>
  );
}

/* Derived from `categories` — see the note in `Navbar.tsx`. This copy and that
   one had drifted in opposite directions: this list carried phones and
   headphones but lost `/contact`, while the one actually mounted by
   `app/layout.tsx` carried `/contact` but never gained the two categories. */
const NAV_LINKS = [
  { href: "/", label: "Home" },
  ...categories.map((category) => ({
    href: `/${category.route}`,
    label: category.pluralLabel,
  })),
  { href: "/compare", label: "Compare" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const wishlist = useWishlist();
  const compare = useCompare();
  const { account, hydrated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const counterClass =
    "absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-4 text-ink-950";

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110] focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-shadow",
          scrolled ? "glass-strong shadow-[0_8px_32px_-24px_rgba(0,0,0,0.6)]" : "glass",
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8"
        >
          <Logo />

          <ul className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-lg px-3 py-2 text-sm font-medium transition",
                      active
                        ? "text-brand-700 dark:text-brand-400"
                        : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white",
                    )}
                  >
                    {link.label}
                    {active ? (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-brand-500"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto hidden min-w-0 flex-1 justify-end xl:flex xl:max-w-sm">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1.5 xl:ml-3">
            <button
              type="button"
              onClick={() => setMobileSearch((value) => !value)}
              aria-label="Toggle search"
              aria-expanded={mobileSearch}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-600 xl:hidden dark:border-white/15 dark:text-ink-200"
            >
              <Search className="size-[18px]" aria-hidden />
            </button>

            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlist.count} ${wishlist.count === 1 ? "item" : "items"}`}
              className="relative hidden size-10 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-600 sm:inline-flex dark:border-white/15 dark:text-ink-200"
            >
              <Heart className="size-[18px]" aria-hidden />
              {wishlist.hydrated && wishlist.count > 0 ? (
                <span className={counterClass}>{wishlist.count}</span>
              ) : null}
            </Link>

            <Link
              href="/compare"
              aria-label={`Compare, ${compare.count} selected`}
              className="relative hidden size-10 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-600 sm:inline-flex dark:border-white/15 dark:text-ink-200"
            >
              <GitCompareArrows className="size-[18px]" aria-hidden />
              {compare.hydrated && compare.count > 0 ? (
                <span className={counterClass}>{compare.count}</span>
              ) : null}
            </Link>

            <ThemeToggle />

            {hydrated && account ? (
              <Link
                href="/profile"
                className={buttonStyles({ variant: "outline", size: "md", className: "hidden sm:inline-flex" })}
              >
                <User className="size-4" aria-hidden />
                {account.name.split(" ")[0]}
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className={buttonStyles({ variant: "primary", size: "md", className: "hidden sm:inline-flex" })}
              >
                <LogIn className="size-4" aria-hidden />
                Login
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-600 lg:hidden dark:border-white/15 dark:text-ink-200"
            >
              <Menu className="size-[18px]" aria-hidden />
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileSearch ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden border-t border-ink-900/5 xl:hidden dark:border-white/10"
            >
              <div className="px-4 py-3 sm:px-6">
                <SearchBar autoFocus />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="glass-strong absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col"
            >
              <div className="flex items-center justify-between border-b border-ink-900/5 px-5 py-4 dark:border-white/10">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto p-3">
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition",
                          active
                            ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                            : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/admin"
                    className="flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-medium text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5"
                  >
                    <LayoutDashboard className="size-4" aria-hidden />
                    Admin
                  </Link>
                </li>
              </ul>

              <div className="border-t border-ink-900/5 p-4 dark:border-white/10">
                {hydrated && account ? (
                  <Link
                    href="/profile"
                    className={buttonStyles({ variant: "outline", className: "w-full" })}
                  >
                    <User className="size-4" aria-hidden />
                    {account.name}
                  </Link>
                ) : (
                  <Link href="/auth/login" className={buttonStyles({ className: "w-full" })}>
                    <LogIn className="size-4" aria-hidden />
                    Login / Register
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
