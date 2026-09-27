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

/**
 * The setup diagnostic.
 *
 * Mail and social sign-in are configured entirely outside the code, so the only
 * way to tell a deployment "your key did not land" is to ask it. This asserts the
 * endpoint reports what the run actually configured rather than a fixed answer:
 * the config sets Google credentials and no Resend key, so a stub that always said
 * `true`, or always said `false`, fails here.
 */
test("health reports which mail and social sign-in config actually landed", async ({
  request,
}, testInfo) => {
  const body = (await (await request.get("/api/health")).json()) as {
    site: string | null;
    mail: { passwordReset: boolean; contactForm: boolean; sharedSender: boolean | null };
    oauth: { id: string; label: string; configured: boolean; callback: string }[];
  };

  // No RESEND_API_KEY in the e2e environment, so mail must report itself absent
  // rather than claiming it can send.
  expect(body.mail.passwordReset).toBe(false);
  expect(body.mail.contactForm).toBe(false);
  expect(body.mail.sharedSender).toBeNull();

  /*
   * All three providers, including the two with no credentials: a callback has to
   * be registered with a provider BEFORE its credentials exist, so a list that hid
   * the unconfigured ones could not be used to set one up.
   */
  expect(body.oauth.map((p) => p.id)).toEqual(["google", "github", "facebook"]);

  // The config sets Google credentials and nothing else, which is what separates a
  // real reading from a hardcoded one.
  const byId = Object.fromEntries(body.oauth.map((p) => [p.id, p]));
  expect(byId.google.configured).toBe(true);
  expect(byId.github.configured).toBe(false);
  expect(byId.facebook.configured).toBe(false);

  /*
   * The whole point of publishing the callback is that it is the string to paste
   * into the provider's console, so it has to match the origin this deployment
   * really runs on — a mismatch is `redirect_uri_mismatch` in production.
   */
  const origin = new URL(testInfo.project.use.baseURL!).origin;
  expect(body.site).toBe(origin);
  for (const provider of body.oauth) {
    expect(provider.callback).toBe(`${origin}/api/auth/oauth/${provider.id}/callback`);
  }
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
