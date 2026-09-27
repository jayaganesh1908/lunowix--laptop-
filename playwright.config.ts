import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * These tests exist because the whole class of bug this suite was written to
 * catch is invisible to `tsc`, ESLint and the unit tests. Two of the four bugs
 * fixed alongside the backend were like that: a toast that silently did nothing
 * because it resolved against an unmounted context, and a wishlist button that
 * could not be clicked because a stretched link painted over it. Both type-check
 * perfectly and both are obvious the moment a browser actually clicks the thing.
 */

const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  /*
   * Serial, one worker, on purpose.
   *
   * The suite asserts that the FIRST account registered becomes the admin, which
   * is only true if nothing else is registering at the same time. Two workers
   * against one database would race for that and one of them would fail with a
   * role mismatch that looks like a bug in the app rather than in the test setup.
   */
  fullyParallel: false,
  workers: 1,

  /*
   * No retries. A retry here would paper over the one thing this suite is for:
   * these tests touch a database, so a "flaky" pass usually means state leaked
   * between tests, and retrying hides that instead of surfacing it.
   */
  retries: 0,

  // Fails the run if a `test.only` is committed by accident.
  forbidOnly: Boolean(process.env.CI),

  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    // Kept only for failures: a trace per test would be gigabytes of artifacts.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /*
         * `E2E_CHROMIUM_PATH` is an escape hatch for environments that already
         * have a Chromium and cannot download one: a sandbox, an air-gapped
         * runner, a Nix shell. Playwright pins an exact browser build per release,
         * so a pre-installed browser from a different Playwright version is
         * refused with "Executable doesn't exist" even though a perfectly good
         * Chromium is sitting on disk.
         *
         * Unset -- which is the normal case, including in CI -- Playwright uses the
         * browser it installed itself, which is the combination its release was
         * tested against and therefore the one to prefer.
         */
        launchOptions: process.env.E2E_CHROMIUM_PATH
          ? { executablePath: process.env.E2E_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  /**
   * Serves the PRODUCTION build, not `next dev`.
   *
   * Two of the bugs this suite guards against only appear in a production build:
   * the hydration mismatch showed up as a minified React error that dev mode
   * reports differently, and `next dev` recompiles per request, which changes the
   * timing the toast assertions depend on. Testing dev would test something
   * nobody deploys.
   *
   * `npm run build` must have run first. CI does it as its own step so a build
   * failure is reported as a build failure rather than as a browser timeout.
   */
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      /*
       * Required in production, and `npm start` sets NODE_ENV=production. Without
       * it the app refuses to sign sessions and every auth test fails with a 500 --
       * correct behaviour, but a confusing way to discover a missing variable.
       * A throwaway value is right here: it signs nothing that outlives the run.
       */
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "e2e-only-signing-key-not-a-secret-000000",
      NEXT_PUBLIC_SITE_URL: BASE_URL,

      /*
       * One provider configured with throwaway credentials, the other two left
       * unset. That covers BOTH halves of the social sign-in behaviour in one
       * run: Google renders as a live link, GitHub and Facebook stay disabled.
       *
       * It is also what makes the CSRF protection testable. The callback refuses
       * an unconfigured provider before it looks at anything else — correctly,
       * since there is nothing to exchange a code with — so without a configured
       * provider a forged callback stops at "not enabled" and the state check is
       * never reached.
       *
       * These credentials never leave the process: every test that uses them
       * fails at the state check, which happens before any network call to
       * Google. Nothing here could authenticate against a real provider.
       */
      GOOGLE_CLIENT_ID: "e2e-not-a-real-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-not-a-real-client-secret",
    },
  },
});
