"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/hooks/useTheme";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

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
