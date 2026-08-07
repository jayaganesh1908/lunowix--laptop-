"use client";

import {
  Cpu,
  Gamepad2,
  LayoutDashboard,
  Laptop,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "laptops", label: "Laptops", Icon: Laptop },
  { id: "users", label: "Users", Icon: Users },
  { id: "reviews", label: "Reviews", Icon: MessageSquare },
  { id: "games", label: "Games", Icon: Gamepad2 },
  { id: "software", label: "Software", Icon: Cpu },
  { id: "settings", label: "Settings", Icon: Settings },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["id"];

export function Sidebar({
  active,
  onChange,
  className,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Admin sections"
      className={cn("card-surface p-3", className)}
    >
      <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        Admin
      </p>
      <ul className="space-y-1">
        {ADMIN_SECTIONS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
