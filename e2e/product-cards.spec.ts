import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The product card controls.
 *
 * Both behaviours here are regression tests for bugs that shipped and that no
 * amount of reading caught. Neither is about the visual design; both are about
 * whether a button does anything at all when a real browser clicks it.
 */

/**
 * Clicks a card control and proves the handler ran.
 *
 * `aria-pressed` is the assertion that carries the weight. It is driven by client
 * state, `expect` retries it, and it is still true a minute later — so it proves
 * both that the click reached the button (the z-index regression) and that the
 * handler executed.
 *
 * The toast is checked in exactly ONE test below, not all of them. A toast lives
 * 3200ms and then removes itself, which makes it the single most timing-sensitive
 * thing on the page; asserting it four times over multiplied that exposure for no
 * extra coverage, and it was the assertion that failed on CI's slower file-store
 * leg while the identical click passed in its siblings.
 */
async function clickAndExpectSaved(control: Locator, expected: "true" | "false" = "true") {
  const before = expected === "true" ? "false" : "true";

  /*
   * Assert the state we are about to toggle FROM, before touching anything.
   *
   * `toBeVisible` alone was satisfied by the server-rendered HTML, which exists
   * before React has attached a handler to it. This is a retrying assertion on a
   * client-driven attribute, so it also waits out that gap — and if the state is
   * ever wrong going in, the failure says so instead of surfacing as a toggle that
   * appears not to have worked.
   */
  await expect(control).toHaveAttribute("aria-pressed", before);

  /*
   * Click until the state flips.
   *
   * CI's file-store leg failed here with `aria-pressed` stuck at "false" through
   * 34 polls over 15 seconds. That is not a slow click: the handler never ran. A
   * click dispatched in the window between `load` and React attaching its
   * listeners is dropped outright — there is no listener to receive it, so unlike
   * a click during hydration there is nothing for React to replay either. It could
   * not be reproduced locally in 32 consecutive runs or under 20x CPU throttling,
   * which is what a window that narrow looks like from a fast machine.
   *
   * Re-clicking a TOGGLE is only safe because each attempt is gated on the state
   * still being `before`: the moment it flips, no further click is sent, so this
   * can never toggle back off and mask a real failure.
   */
  await expect(async () => {
    if ((await control.getAttribute("aria-pressed")) === before) await control.click();
    await expect(control).toHaveAttribute("aria-pressed", expected, { timeout: 2_000 });
  }).toPass({ timeout: 20_000, intervals: [500, 1_000, 2_000, 4_000] });
}

/**
 * The one place the toast itself is asserted.
 *
 * The wait is armed BEFORE the click, so the listener is attached before the toast
 * mounts and its short life cannot be missed. `aria-pressed` is checked first, so a
 * failure is unambiguous: if that passed and this did not, the handler ran but its
 * toast never reached a mounted provider — which is precisely the bug this guards.
 */
async function clickAndExpectToast(page: Page, control: Locator, message: RegExp) {
  await expect(control).toBeVisible();

  const toast = page.locator('[aria-live="polite"]').getByText(message);
  const appeared = toast.waitFor({ state: "visible", timeout: 15_000 });

  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
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
    await clickAndExpectSaved(compare);
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
    await clickAndExpectSaved(heart);

    // The sharper half of the z-index regression: the stretched link behind the
    // button must not have swallowed the click and navigated.
    await expect(page).toHaveURL(/\/phones\/?$/);
  });

  /** A saved product must survive a reload, which is the point of storing it. */
  test("a saved product persists across a reload", async ({ page }) => {
    await page.goto("/phones");

    const heart = page.locator('button[aria-label*="wishlist" i]').first();
    await clickAndExpectSaved(heart);

    await page.goto("/wishlist");
    // The board renders cards; the empty state is what must NOT be there.
    await expect(page.getByText(/nothing saved yet/i)).toHaveCount(0);
  });
});
