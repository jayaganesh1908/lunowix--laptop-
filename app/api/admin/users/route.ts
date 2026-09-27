import { forbidden, guarded, ok, unauthorized } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth/guard";
import { listUsers } from "@/lib/server/repo/users";
import { wishlistCountFor } from "@/lib/server/repo/wishlist";
import { getStore } from "@/lib/server/store";

/**
 * The account list for the admin users table. Admin only.
 *
 * Carries no password hashes and no session tokens — only what the table draws.
 * An endpoint that returns a hash is a breach waiting for one XSS.
 */
export const dynamic = "force-dynamic";

export const GET = guarded(async () => {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.reason === "forbidden" ? forbidden() : unauthorized();

  const users = await listUsers();
  const store = getStore();

  const rows = await Promise.all(
    users.map(async (user) => ({
      id: user.id,
      name: user.name,
      email: user.displayEmail,
      role: user.role,
      joinedAt: user.createdAt,
      wishlistCount: await wishlistCountFor(user.id),
      comparisons: await store.count("compareHistory", { userId: user.id }),
      /*
       * "Active" means holding at least one unexpired session, which is a fact
       * this data can support. The demo table's `active` flag was a hand-written
       * boolean that meant nothing.
       */
      active: (await store.find<{ id: string; userId: string; expiresAt: number }>(
        "sessions",
        { userId: user.id },
      )).some((session) => session.expiresAt > Date.now()),
    })),
  );

  rows.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  return ok({ users: rows });
});
