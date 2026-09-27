import { expect, test } from "@playwright/test";

/**
 * The deployment smoke test.
 *
 * `/api/health` is what a deploy is supposed to be checked with, so it is worth
 * asserting that it reports honestly rather than always saying "ok". A health
 * endpoint that cannot fail is decoration.
 */

test("health reports ok, and names the store it is actually using", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    status: string;
    store: string;
    auth: boolean;
    reachable: boolean;
  };

  expect(body.status).toBe("ok");
  expect(body.auth).toBe(true);
  expect(body.reachable).toBe(true);

  /*
   * Whichever adapter the run configured. CI runs this suite against both, so
   * pinning one value here would fail half the matrix -- but the field must be one
   * of the two rather than absent, which is what catches a broken selector.
   */
  expect(["postgres", "file"]).toContain(body.store);

  // A misconfigured deploy is the thing this endpoint exists to reveal, so if the
  // run set DATABASE_URL the endpoint has to agree.
  if (process.env.DATABASE_URL) expect(body.store).toBe("postgres");
});

test("the products API validates its query string instead of ignoring it", async ({
  request,
}) => {
  const ok = await request.get("/api/products?category=phone&sort=price-asc&limit=3");
  expect(ok.status()).toBe(200);

  const body = (await ok.json()) as {
    products: { category: string; price: number }[];
    limit: number;
  };
  expect(body.limit).toBe(3);
  expect(body.products).toHaveLength(3);
  expect(new Set(body.products.map((p) => p.category))).toEqual(new Set(["phone"]));
  // Ascending, as asked.
  const prices = body.products.map((p) => p.price);
  expect([...prices].sort((a, b) => a - b)).toEqual(prices);

  /*
   * This route was briefly `force-static`, which gave it no request to read: the
   * search params came back empty, every filter was ignored and the validation
   * below was unreachable, all behind a 200. A status-only assertion would have
   * passed throughout, so these check the CONTENTS above and the rejection here.
   */
  expect((await request.get("/api/products?limit=abc")).status()).toBe(400);
  expect((await request.get("/api/products?category=fridge")).status()).toBe(400);
});

test("protected routes refuse an anonymous caller", async ({ request }) => {
  expect((await request.get("/api/wishlist")).status()).toBe(401);
  expect((await request.get("/api/admin/stats")).status()).toBe(401);
});

test("a forged session cookie is rejected", async ({ request }) => {
  const response = await request.get("/api/auth/session", {
    headers: { cookie: "lunowix_session=forged-id.forged-signature" },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).user).toBeNull();
});
