import { expect, test } from "@playwright/test";

/**
 * The product card controls.
 *
 * Both assertions here are regression tests for bugs that shipped and that no
 * amount of reading caught. Neither is about the visual design; both are about
 * whether a button does anything at all when a real browser clicks it.
 */

test.describe("product card controls", () => {
  /**
   * Two bugs at once, and the reason this file exists.
   *
   * 1. `components/providers/index.tsx` held a duplicate `ToastProvider` with its
   *    own `createContext()`. `ProductCard` imported `useToast` from that barrel,
   *    resolved against a context with no provider mounted, hit the "safe outside
   *    the provider" no-op fallback, and got a `toast()` that did nothing. Every
   *    save confirmation on /phones, /headphones, /products and /search was
   *    silently dropped -- while laptop cards, importing directly, worked.
   *
   * 2. The card title's stretched link (`after:inset-0`) had no z-index and came
   *    later in the DOM than the button strip, so it painted over the heart.
   *    Clicking it navigated to the product page instead of saving.
   *
   * A passing toast proves both are fixed: the click has to reach the button, and
   * the button's toast has to reach a mounted provider.
   */
  test("saving a phone shows a confirmation toast", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await expect(heart).toBeVisible();
    await heart.click();

    // The toast region is the aria-live landmark, so this also checks it is announced.
    const toast = page.locator('[aria-live="polite"]').getByText(/added to wishlist/i);
    await expect(toast).toBeVisible();
  });

  /**
   * The compare control is offered ONLY on laptop cards -- the comparison table is
   * built around laptop specs, so the button is not rendered where it would lead
   * nowhere. Testing it on /phones would fail for the right reason and look like
   * the wrong one, which is worth a comment rather than a puzzled reader.
   */
  test("adding a laptop to compare shows a confirmation toast", async ({ page }) => {
    await page.goto("/laptops");

    const compare = page.locator('button[aria-label*="compare" i]').first();
    await expect(compare).toBeVisible();
    await compare.click();

    await expect(
      page.locator('[aria-live="polite"]').getByText(/added to compare/i),
    ).toBeVisible();
  });

  /**
   * The click has to land on the button, not on the card link behind it.
   *
   * This is the sharper version of the z-index regression: a toast could in
   * principle appear while the page also navigated. Staying on /phones is what
   * proves the stretched link did not swallow the click.
   */
  test("saving does not navigate away from the listing", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await expect(heart).toBeVisible();
    await heart.click();

    await expect(page.locator('[aria-live="polite"]').getByText(/wishlist/i)).toBeVisible();
    await expect(page).toHaveURL(/\/phones\/?$/);
  });

  /** A saved product must survive a reload, which is the point of storing it. */
  test("a saved product persists across a reload", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await expect(heart).toBeVisible();
    await heart.click();
    await expect(page.locator('[aria-live="polite"]').getByText(/wishlist/i)).toBeVisible();

    await page.goto("/wishlist");
    // The board renders cards; the empty state is what we must NOT see.
    await expect(page.getByText(/nothing saved yet/i)).toHaveCount(0);
  });
});
