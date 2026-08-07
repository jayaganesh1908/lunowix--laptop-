"use client";

import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "lunowix:theme";

export interface ThemeContextValue {
  /** What the user picked. */
  mode: ThemeMode;
  /** What is actually painted, after resolving `system`. */
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light → dark → system. */
  toggleTheme: () => void;
  mounted: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
