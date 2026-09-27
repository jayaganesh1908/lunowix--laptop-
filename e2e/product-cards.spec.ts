import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The product card controls.
 *
 * Both behaviours here are regression tests for bugs that shipped and that no
 * amount of reading caught. Neither is about the visual design; both are about
 * whether a button does anything at all when a real browser clicks it.
 */

/**
 * Clicks, and catches the toast without racing it.
 *
 * Toasts dismiss themselves after 3200ms. An `expect(toast).toBeVisible()` AFTER
 * the click therefore has a 3.2 second window to land in, against a 15 second
 * polling timeout — so on a slow machine the toast can appear, live its life and
 * be gone before the first poll, and the failure reads "element(s) not found",
 * exactly as though the toast had never fired. That is what made two of these
 * tests fail on CI's slower storage adapter while the same assertions passed on
 * the faster one.
 *
 * Arming the wait BEFORE the click removes the window entirely: the listener is
 * already attached when the toast mounts, so a miss is now a real miss.
 *
 * It also asserts `aria-pressed` afterwards, which is the durable half. The toast
 * proves the handler reached a mounted provider; `aria-pressed` proves the click
 * reached the button and changed state, and unlike the toast it is still there a
 * minute later.
 */
async function clickAndExpectToast(page: Page, control: Locator, message: RegExp) {
  await expect(control).toBeVisible();

  const toast = page.locator('[aria-live="polite"]').getByText(message);
  const appeared = toast.waitFor({ state: "visible", timeout: 15_000 });

  await control.click();
  await appeared;
}

test.describe("product card controls", () => {
  /**
   * Two bugs at once, and the reason this file exists.
   *
   * 1. `components/providers/index.tsx` held a duplicate `ToastProvider` with its
   *    own `createContext()`. `ProductCard` imported `useToast` from that barrel,
   *    resolved against a context with no provider mounted, hit the "safe outside
   *    the provider" no-op fallback, and got a `toast()` that did nothing. Every
   *    save confirmation on /phones, /headphones, /products and /search was
   *    silently dropped — while laptop cards, importing directly, worked.
   *
   * 2. The card title's stretched link (`after:inset-0`) had no z-index and came
   *    later in the DOM than the button strip, so it painted over the heart.
   *    Clicking it navigated to the product page instead of saving.
   *
   * A toast plus a flipped `aria-pressed` proves both: the click has to reach the
   * button, and its toast has to reach a mounted provider.
   */
  test("saving a phone shows a confirmation toast", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await expect(heart).toHaveAttribute("aria-pressed", "false");

    await clickAndExpectToast(page, heart, /added to wishlist/i);

    // The durable half: state actually changed, and still has a minute later.
    await expect(heart).toHaveAttribute("aria-pressed", "true");
  });

  /**
   * The compare control is offered ONLY on laptop cards — the comparison table is
   * built around laptop specs, so the button is not rendered where it would lead
   * nowhere. Testing it on /phones would fail for the right reason and look like
   * the wrong one, which is worth a comment rather than a puzzled reader.
   */
  test("adding a laptop to compare shows a confirmation toast", async ({ page }) => {
    await page.goto("/laptops");

    const compare = page.locator('button[aria-label*="compare" i]').first();
    await clickAndExpectToast(page, compare, /added to compare/i);

    await expect(compare).toHaveAttribute("aria-pressed", "true");
  });

  /**
   * The click has to land on the button, not on the card link behind it.
   *
   * This is the sharper version of the z-index regression: a toast could in
   * principle fire while the page also navigated. Staying on /phones is what
   * proves the stretched link did not swallow the click.
   */
  test("saving does not navigate away from the listing", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await clickAndExpectToast(page, heart, /wishlist/i);

    await expect(page).toHaveURL(/\/phones\/?$/);
  });

  /** A saved product must survive a reload, which is the point of storing it. */
  test("a saved product persists across a reload", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await clickAndExpectToast(page, heart, /added to wishlist/i);

    await page.goto("/wishlist");
    // The board renders cards; the empty state is what must NOT be there.
    await expect(page.getByText(/nothing saved yet/i)).toHaveCount(0);
  });
});
