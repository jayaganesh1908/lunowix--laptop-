import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

/**
 * Clicks, and catches the toast without racing it.
 *
 * Toasts dismiss themselves after 3200ms, so an assertion made AFTER the click has
 * only that window to land in — and on a slow machine the toast can appear, expire
 * and be gone before the first poll, failing as "element(s) not found" exactly as
 * though it had never fired. Arming the wait first removes the window.
 */
async function clickAndExpectToast(page: Page, control: Locator, message: RegExp) {
  await expect(control).toBeVisible();
  const toast = page.locator('[aria-live="polite"]').getByText(message);
  const appeared = toast.waitFor({ state: "visible", timeout: 15_000 });
  await control.click();
  await appeared;
}

/**
 * The account lifecycle, end to end through the real UI.
 *
 * ONE browser context for the whole file, created in `beforeAll`.
 *
 * This is not an optimisation. Playwright gives every test a fresh context by
 * default, which means fresh cookies and fresh localStorage — so a `serial`
 * describe shares execution ORDER but not session STATE. Written the default way,
 * the account registered in the first test was signed out by the second, and the
 * navbar assertion failed looking for an account menu that correctly was not
 * there. Sharing the context is what makes "register, then use the account, then
 * sign out" a single story rather than eight unrelated visits.
 *
 * It does NOT assume an empty database. The first account on a deployment becomes
 * the admin, so on a fresh CI database this run's account is an admin, while a
 * re-run locally against the same database produces a member. An earlier version
 * asserted the admin path unconditionally and failed on the second local run for
 * a reason that had nothing to do with the app. It now reads the role the server
 * actually assigned and asserts the matching UI — and registers a second account
 * to cover the member path explicitly, so both branches are exercised either way.
 */

test.describe.serial("account lifecycle", () => {
  /*
   * A unique address per run. Hardcoding one worked exactly once: the second run
   * got a 409 for an address that already existed, and the failure read as
   * "registration is broken" rather than "the test left state behind".
   */
  const email = `e2e-${Date.now()}@example.com`;
  const password = "a-long-enough-passphrase";

  let context: BrowserContext;
  let page: Page;
  /** Whatever the server assigned: "admin" on a fresh database, else "member". */
  let role: "member" | "editor" | "admin";

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  /** Reads the browser's saved wishlist, tolerating absence and junk. */
  const savedIds = () =>
    page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("lunowix:wishlist") ?? "[]") as string[];
      } catch {
        return [] as string[];
      }
    });

  test("registering keeps what the browser already had", async () => {
    // Save a phone while signed out, so there is something to merge.
    await page.goto("/phones");
    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await clickAndExpectToast(page, heart, /wishlist/i);

    const before = await savedIds();
    expect(before.length).toBeGreaterThan(0);

    await page.goto("/auth/register");
    await page.getByLabel("Your name").fill("E2E Tester");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Registration signs you in and sends you to the wishlist.
    await expect(page).toHaveURL(/\/wishlist/);

    /*
     * The merge is a UNION, never a replacement. Someone who saved a phone before
     * signing up expects to still have it — losing it is the failure this checks.
     */
    expect(await savedIds()).toEqual(expect.arrayContaining(before));

    // And the account holds it server-side, not just this browser.
    const fromServer = await page.evaluate(async () => {
      const response = await fetch("/api/wishlist");
      if (!response.ok) return null;
      return ((await response.json()) as { productIds: string[] }).productIds;
    });
    expect(fromServer).toEqual(expect.arrayContaining(before));

    // Read the role the server assigned; the admin test below branches on it.
    role = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      return ((await response.json()) as { user: { role: "member" | "editor" | "admin" } })
        .user.role;
    });
    expect(["member", "editor", "admin"]).toContain(role);
  });

  test("the navbar swaps the login control for an account menu", async () => {
    await page.goto("/");
    await expect(page.locator('button[aria-label*="Account menu" i]')).toBeVisible();
  });

  /**
   * /admin must match the account's role.
   *
   * On a fresh database this account is the admin — that rule matters because
   * there is no UI to change it afterwards, so if it regressed a new deployment
   * would have no reachable admin at all. On a re-used database it is a member,
   * and the page must say so rather than leaking figures.
   */
  test("the admin page matches the account's role", async () => {
    await page.goto("/admin");

    if (role === "admin") {
      await expect(page.getByText("Accounts", { exact: true })).toBeVisible();
      await expect(page.getByText(/cannot see live figures/i)).toHaveCount(0);
    } else {
      await expect(page.getByText(/cannot see live figures/i)).toBeVisible();
      await expect(page.getByText("Accounts", { exact: true })).toHaveCount(0);
    }
  });

  /**
   * A second account is always a member, whatever the database started as — so
   * this covers the denial path deterministically even on a fresh CI database
   * where the account above is the admin.
   *
   * Its own context, because it is a different person: reusing the shared one
   * would sign the first account out for the tests that follow.
   */
  test("a later account is a member and is refused the admin figures", async ({ browser }) => {
    const second = await browser.newContext();
    const secondPage = await second.newPage();

    try {
      await secondPage.goto("/auth/register");
      await secondPage.getByLabel("Your name").fill("Second Person");
      await secondPage.getByLabel("Email", { exact: true }).fill(`e2e-second-${Date.now()}@example.com`);
      await secondPage.getByLabel("Password", { exact: true }).fill("another-long-passphrase");
      await secondPage.getByRole("button", { name: /create account/i }).click();
      await expect(secondPage).toHaveURL(/\/wishlist/);

      const secondRole = await secondPage.evaluate(async () => {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        return ((await response.json()) as { user: { role: string } }).user.role;
      });
      expect(secondRole).toBe("member");

      // 403, not 401: signed in, but this account will never be allowed.
      const status = await secondPage.evaluate(async () => {
        const response = await fetch("/api/admin/stats");
        return response.status;
      });
      expect(status).toBe(403);

      await secondPage.goto("/admin");
      await expect(secondPage.getByText(/cannot see live figures/i)).toBeVisible();
    } finally {
      await second.close();
    }
  });

  test("a signed-in visitor can write a review and see it appear", async () => {
    await page.goto("/phones/moto-g64-5g");

    await page.getByLabel("Title", { exact: true }).fill("Genuinely good value");
    await page
      .getByLabel("Your review")
      .fill("Battery comfortably lasts a full day with navigation on the commute.");
    await page.getByRole("button", { name: /post review/i }).click();

    /*
     * `expect` polls, so it waits for the POST and the re-render. A bare
     * `isVisible()` here reported a false failure once: it answers for the DOM as
     * it is and never retries, so it ran before React had re-rendered.
     */
    await expect(page.getByText("Genuinely good value").first()).toBeVisible();
  });

  test("signing out clears the session but keeps the browser's saved products", async () => {
    await page.goto("/");

    await page.locator('button[aria-label*="Account menu" i]').click();

    const signOut = page.getByRole("menuitem", { name: /sign out/i });
    await clickAndExpectToast(page, signOut, /signed out/i);

    const session = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      return ((await response.json()) as { user: unknown }).user;
    });
    expect(session).toBeNull();

    // Deliberate: signing out must not look like it deleted someone's wishlist.
    expect((await savedIds()).length).toBeGreaterThan(0);
  });

  test("signed out, the review form is gated but the review stays public", async () => {
    await page.goto("/phones/moto-g64-5g");

    await expect(page.getByText(/sign in to write a review/i)).toBeVisible();
    await expect(page.getByText("Genuinely good value").first()).toBeVisible();
  });

  test("the wrong password is refused with a message that reveals nothing", async () => {
    await page.goto("/auth/login");

    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    /*
     * The same wording for a wrong password and for an unknown address, so the
     * form cannot be used to discover which addresses are registered.
     *
     * Scoped to the form on purpose. A bare `getByRole("alert")` is ambiguous in
     * any Next.js app: the framework always renders an empty
     * `<div role="alert" id="__next-route-announcer__">` for route changes, so the
     * query resolves to two elements and fails strict mode — reporting a selector
     * problem in a way that reads like the message never appeared.
     */
    await expect(page.locator("form").getByRole("alert")).toContainText(/do not match/i);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("signing back in restores the account", async () => {
    await page.goto("/auth/login");

    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/wishlist/);
    await expect(page.locator('button[aria-label*="Account menu" i]')).toBeVisible();
  });
});

/**
 * The social buttons reflect the deployment, not a hardcoded assumption.
 *
 * `playwright.config.ts` configures Google with throwaway credentials and leaves
 * GitHub and Facebook unset, so one run covers both states: a live provider
 * renders as a link, an unconfigured one stays disabled and says so.
 */
test.describe("social sign-in", () => {
  test("reports exactly the providers that are configured", async ({ request }) => {
    const response = await request.get("/api/auth/providers");
    expect(response.status()).toBe(200);

    const { providers } = (await response.json()) as { providers: { id: string }[] };
    expect(providers.map((p) => p.id)).toEqual(["google"]);
  });

  test("enables a configured provider and disables the rest", async ({ page }) => {
    await page.goto("/auth/login");

    // Live renders as an <a> that leaves for the provider.
    const google = page.locator('a[aria-label="Continue with Google"]');
    await expect(google).toBeVisible();
    await expect(google).toHaveAttribute("href", "/api/auth/oauth/google");

    // Unconfigured renders as a disabled <button>, never a link.
    for (const label of ["GitHub", "Facebook"]) {
      await expect(page.locator(`button[aria-label*="Continue with ${label}"]`)).toBeDisabled();
      await expect(page.locator(`a[aria-label="Continue with ${label}"]`)).toHaveCount(0);
    }
  });

  test("starting a configured flow redirects to the provider with state and PKCE", async ({
    page,
  }) => {
    // Not followed: the provider is unreachable and irrelevant. What matters is
    // the URL this app builds and that it pins a state cookie before leaving.
    const response = await page.request.get("/api/auth/oauth/google", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);

    const target = new URL(response.headers().location);
    expect(target.host).toBe("accounts.google.com");
    expect(target.searchParams.get("response_type")).toBe("code");
    expect(target.searchParams.get("redirect_uri")).toContain("/api/auth/oauth/google/callback");
    expect(target.searchParams.get("state")).toBeTruthy();
    // PKCE, so an intercepted code cannot be redeemed without the verifier.
    expect(target.searchParams.get("code_challenge")).toBeTruthy();
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
  });

  /*
   * These assert the MESSAGE, not the URL.
   *
   * The form deliberately strips `?error=` from the address bar after reading it,
   * so a refresh does not re-show a stale message — which means asserting on the
   * query string is a race against that cleanup. One of these passed on it and the
   * other did not. What the visitor actually gets is the sentence, so that is what
   * is checked.
   */
  test("an unconfigured provider is refused with a readable reason", async ({ page }) => {
    await page.goto("/api/auth/oauth/github");

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator("form").getByRole("alert")).toContainText(/not enabled on this site/i);
  });

  test("a forged callback is refused rather than signing anyone in", async ({ page }) => {
    // No state cookie, so the CSRF pin cannot match whatever is in the query.
    await page.goto("/api/auth/oauth/google/callback?code=fake&state=forged");

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator("form").getByRole("alert")).toContainText(/could not be verified/i);

    // And most importantly: nobody was signed in.
    const session = await page.evaluate(async () => {
      const r = await fetch("/api/auth/session", { cache: "no-store" });
      return ((await r.json()) as { user: unknown }).user;
    });
    expect(session).toBeNull();
  });
});
