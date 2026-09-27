"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { buttonStyles } from "@/components/common/buttonStyles";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

/**
 * Real accounts.
 *
 * This table used to render `demoUsers`, ten hand-written rows with invented
 * names, join dates and wishlist counts. It now reads `/api/admin/users`, so an
 * empty deployment shows an empty table — which is the truth, and far more
 * useful than ten fictional people.
 */

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "member" | "editor" | "admin";
  joinedAt: string;
  wishlistCount: number;
  comparisons: number;
  active: boolean;
}

type State =
  | { status: "loading" }
  | { status: "ready"; users: AdminUserRow[] }
  | { status: "denied"; reason: "unauthenticated" | "forbidden" }
  | { status: "error" };

const th =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400";
const td = "whitespace-nowrap px-4 py-3 text-sm";

/** Stored lower case; capitalised only for display. */
const ROLE_LABEL: Record<AdminUserRow["role"], string> = {
  admin: "Admin",
  editor: "Editor",
  member: "Member",
};

const ROLE_TONE: Record<AdminUserRow["role"], "brand" | "info" | "neutral"> = {
  admin: "brand",
  editor: "info",
  member: "neutral",
};

export function UserTable() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (cancelled) return;

        if (response.status === 401) return setState({ status: "denied", reason: "unauthenticated" });
        if (response.status === 403) return setState({ status: "denied", reason: "forbidden" });
        if (!response.ok) return setState({ status: "error" });

        const data = (await response.json()) as { users: AdminUserRow[] };
        setState({ status: "ready", users: data.users });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="card-surface mt-5 p-6">
        <p className="text-sm text-ink-500 dark:text-ink-400">Loading accounts…</p>
      </div>
    );
  }

  if (state.status === "denied") {
    return (
      <div className="card-surface mt-5 p-6">
        <h3 className="text-base font-bold">
          {state.reason === "unauthenticated" ? "Sign in to see accounts" : "Admins only"}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          The account list comes from the database and is limited to admin
          accounts. The first account created on a deployment becomes its admin.
        </p>
        {state.reason === "unauthenticated" ? (
          <Link href="/auth/login?next=/admin" className={buttonStyles({ className: "mt-4" })}>
            Sign in
          </Link>
        ) : null}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="card-surface mt-5 p-6">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          The account list could not be loaded.
        </p>
      </div>
    );
  }

  if (state.users.length === 0) {
    return (
      <div className="card-surface mt-5 p-6">
        <h3 className="text-base font-bold">No accounts yet</h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Nobody has registered on this deployment. Accounts appear here as soon
          as someone signs up at <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">/auth/register</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface mt-5 overflow-x-auto">
      <table className="w-full min-w-[48rem]">
        <caption className="sr-only">Registered accounts</caption>
        <thead className="border-b border-ink-900/5 dark:border-white/10">
          <tr>
            <th scope="col" className={th}>User</th>
            <th scope="col" className={th}>Role</th>
            <th scope="col" className={th}>Joined</th>
            <th scope="col" className={th}>Wishlist</th>
            <th scope="col" className={th}>Comparisons</th>
            <th scope="col" className={th}>Session</th>
          </tr>
        </thead>
        <tbody>
          {state.users.map((user) => (
            <tr key={user.id} className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10">
              <td className={td}>
                <span className="block font-semibold">{user.name}</span>
                <span className="block text-xs text-ink-500 dark:text-ink-400">{user.email}</span>
              </td>
              <td className={td}>
                <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
              </td>
              <td className={cn(td, "text-ink-600 dark:text-ink-300")}>
                {formatDate(user.joinedAt.slice(0, 10))}
              </td>
              <td className={cn(td, "font-mono tabular-nums")}>{user.wishlistCount}</td>
              <td className={cn(td, "font-mono tabular-nums")}>{user.comparisons}</td>
              <td className={td}>
                <Badge tone={user.active ? "success" : "neutral"}>
                  {user.active ? "Signed in" : "Signed out"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
