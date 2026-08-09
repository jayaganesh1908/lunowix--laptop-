"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  SessionContext,
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedTheme,
  type SessionAccount,
  type ThemeMode,
  useLocalStorage,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useLocalStorage<ThemeMode>(THEME_STORAGE_KEY, "system");
  const [system, setSystem] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Track the OS preference live so `system` mode follows it without a reload.
  useEffect(() => {
    const query = window.matchMedia(MEDIA_QUERY);
    const sync = () => setSystem(query.matches ? "dark" : "light");
    sync();
    setMounted(true);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const theme: ResolvedTheme = mode === "system" ? system : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  /**
   * Straight light <-> dark, keyed off the *resolved* theme.
   *
   * This used to cycle light -> dark -> system. Whenever the OS preference
   * matched one of the two, `system` rendered identically to it, so every other
   * click looked like a no-op. `system` is still the first-visit default and is
   * still selectable from the admin settings panel.
   */
  const toggleTheme = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
  }, [setMode, theme]);

  const value = useMemo(
    () => ({ mode, theme, setMode, toggleTheme, mounted }),
    [mode, theme, setMode, toggleTheme, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Runs before first paint so a stored dark preference does not flash white.
 * Kept as a string because it is injected via `dangerouslySetInnerHTML`.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var mode = stored ? JSON.parse(stored) : 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('${MEDIA_QUERY}').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export { systemTheme };

/**
 * Publishes the signed-in user to client components.
 *
 * Seeded with `initialAccount` from the server so the first paint already knows
 * who is signed in — otherwise the navbar would flash its signed-out state on
 * every navigation.
 */
export function SessionProvider({
  initialAccount,
  children,
}: {
  initialAccount: SessionAccount | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<SessionAccount | null>(initialAccount);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured);

  // Keep in step when the server sends down a different user (sign-in, sign-out,
  // or a profile update that revalidated the layout).
  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setHydrated(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // The account object itself comes from the server (it carries the profile
      // row, which the client session does not). Refreshing the router re-runs
      // the layout and pushes a fresh `initialAccount` down.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const value = useMemo(
    () => ({
      account,
      isAuthenticated: Boolean(account),
      isAdmin: account?.role === "admin",
      hydrated,
    }),
    [account, hydrated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

type ToastTone = "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
} as const;

const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-brand-600 dark:text-brand-400",
  warning: "text-yellow-600 dark:text-yellow-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const Icon = TONE_ICON[item.tone];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="glass-strong pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-lift)]"
              >
                <Icon className={cn("size-5 shrink-0", TONE_CLASS[item.tone])} aria-hidden />
                <p className="flex-1 text-sm font-medium">{item.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="rounded-full p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** Safe to call outside the provider (returns a no-op) so components stay portable. */
export function useToast() {
  const context = useContext(ToastContext);
  return context ?? { toast: () => undefined };
}

export function AppProviders({
  initialAccount,
  children,
}: {
  initialAccount: SessionAccount | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider initialAccount={initialAccount}>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
