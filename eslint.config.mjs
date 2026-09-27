import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",

      /*
       * Playwright's own output. `playwright-report/` embeds a bundled, minified
       * HTML report, and linting it produced over three thousand problems — which,
       * with `--max-warnings 0` on the lint script, fails the run for a reason that
       * has nothing to do with the contributor's code. Anyone whose end-to-end run
       * had failed would then see lint blow up and reasonably assume they broke it.
       */
      "test-results/**",
      "playwright-report/**",
      "blob-report/**",

      // The local file store: real data, not source.
      ".data/**",
    ],
  },
];

export default eslintConfig;
