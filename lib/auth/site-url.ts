import "server-only";

import { headers } from "next/headers";

/**
 * The origin to build OAuth and email redirect URLs from.
 *
 * In development this is taken from the incoming request rather than from
 * `NEXT_PUBLIC_SITE_URL`. Next.js falls back to :3001 (then :3002…) whenever
 * :3000 is busy, and a hard-coded origin then sends the OAuth callback to a
 * port with nothing listening on it — you sign in successfully and land on
 * "this site can't be reached".
 *
 * In production the configured value wins: the `Host` header is client
 * supplied, so it should not decide where auth links point.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production" && configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (host) {
    const proto =
      headerList.get("x-forwarded-proto") ??
      (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  return configured ?? "http://localhost:3000";
}
