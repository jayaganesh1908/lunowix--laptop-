import { fail, guarded, ok, readJson, unauthorized } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth/guard";
import { comparePairSchema } from "@/lib/server/validation";
import {
  clearCompareHistory,
  listCompareHistory,
  recordComparison,
} from "@/lib/server/repo/compare";
import { getProductById } from "@/lib/data/products";

export const dynamic = "force-dynamic";

export const GET = guarded(async () => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();
  return ok({ history: await listCompareHistory(auth.user.id) });
});

export const POST = guarded(async (request: Request) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  const body = await readJson(request, comparePairSchema);
  if (!body.ok) return body.response;

  const [a, b] = body.data.pair;
  const first = getProductById(a);
  const second = getProductById(b);

  if (!first || !second) return fail("One of those products does not exist.", 404);

  /*
   * Same category, mirroring the client's `useCompare`.
   *
   * Half the comparison table's rows are category-specific — a phone has no GPU
   * VRAM, a laptop has no optical zoom — so a stored mixed pair would reopen as
   * a table of blanks from the history list.
   */
  if (first.category !== second.category) {
    return fail("Those two cannot be compared — they are different kinds of product.", 422);
  }

  if (a === b) return fail("Pick two different products.", 422);

  return ok({ history: await recordComparison(auth.user.id, [a, b]) });
});

export const DELETE = guarded(async () => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  await clearCompareHistory(auth.user.id);
  return ok({ history: [] });
});
