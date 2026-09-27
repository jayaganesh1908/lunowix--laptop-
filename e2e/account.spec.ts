import { expect, test, type BrowserContext, type Page } from "@playwright/test";

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
    await expect(heart).toBeVisible();
    await heart.click();
    await expect(page.locator('[aria-live="polite"]').getByText(/wishlist/i)).toBeVisible();

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
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect(page.locator('[aria-live="polite"]').getByText(/signed out/i)).toBeVisible();

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
