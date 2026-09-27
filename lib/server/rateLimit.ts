import "server-only";

/**
 * A fixed-window limiter, in memory.
 *
 * Scope, stated plainly: it counts per PROCESS. Behind several instances the
 * effective limit multiplies by the instance count, and a restart forgets
 * everything. It is a brake on password guessing and on someone holding down
 * the subscribe button — not a defence against a distributed attack, which
 * belongs at the edge (Cloudflare, or the host's own rate limiting) where the
 * request can be dropped before it costs anything.
 *
 * It is here because the alternative at this scale is no limit at all, and an
 * unmetered login endpoint in front of a 200ms scrypt verify is also a cheap
 * way to exhaust the CPU of a free-tier instance.
 */

interface Window {
  count: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

/*
 * Bound the map so a flood of distinct keys cannot grow it without limit —
 * which would turn the limiter itself into the memory exhaustion it is meant to
 * prevent. Expired entries are swept first; if everything is still live, the
 * request is allowed rather than denied, because failing open on a brake is
 * better than locking every visitor out.
 */
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. For the `Retry-After` header. */
  retryAfter: number;
  remaining: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      sweep(now);
      if (windows.size >= MAX_TRACKED_KEYS) {
        return { allowed: true, retryAfter: 0, remaining: limit - 1 };
      }
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    retryAfter: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
    remaining: Math.max(0, limit - existing.count),
  };
}

/**
 * The best available client identifier.
 *
 * `x-forwarded-for` is set by whatever proxy is in front of the app and CAN be
 * spoofed when nothing trusted sets it — so this is a key for a brake, not an
 * identity for an access decision. The leftmost entry is the original client
 * when the chain is trustworthy.
 */
export function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${bucket}:${ip}`;
}

/** Test seam. */
export function resetRateLimits() {
  windows.clear();
}
