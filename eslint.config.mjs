import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const createRestrictedImportsRule = (patterns) => [
  "error",
  {
    patterns,
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Build artifacts for Vinext/Vite output.
    "dist/**",
    "next-env.d.ts",
    // packages/ are independent workspaces with their own ESLint configs.
    "packages/**",
    // Pre-built design system assets (minified GSAP/ScrollTrigger bundles).
    "parallax-geometry/**",
  ]),
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": createRestrictedImportsRule([
        {
          group: ["../server/**", "@/server/**"],
          message: "UI code must not import server layers directly.",
        },
      ]),
    },
  },
  {
    files: ["src/app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/server/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": createRestrictedImportsRule([
        {
          group: [
            "../repositories/**",
            "../infrastructure/**",
            "@/server/repositories/**",
            "@/server/infrastructure/**",
            "stripe",
          ],
          message: "API handlers must stay thin and cannot import repositories or infrastructure directly.",
        },
      ]),
    },
  },
  {
    files: ["src/server/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": createRestrictedImportsRule([
        {
          group: [
            "../api/**",
            "../infrastructure/**",
            "@/server/api/**",
            "@/server/infrastructure/**",
            "next/**",
            "vinext/**",
            "stripe",
          ],
          message:
            "Application code must remain framework-agnostic and cannot depend on API, infrastructure, or runtime frameworks.",
        },
      ]),
    },
  },
  {
    files: ["src/server/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": createRestrictedImportsRule([
        {
          group: [
            "../api/**",
            "../application/**",
            "../repositories/**",
            "../infrastructure/**",
            "@/server/api/**",
            "@/server/application/**",
            "@/server/repositories/**",
            "@/server/infrastructure/**",
            "next/**",
            "vinext/**",
            "stripe",
          ],
          message:
            "Domain code must stay isolated from adapters, repositories, runtime frameworks, and framework-facing layers.",
        },
      ]),
    },
  },
  {
    files: ["src/server/repositories/**/*.{ts,tsx}", "src/server/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": createRestrictedImportsRule([
        {
          group: ["stripe"],
          message: "Stripe SDK must stay isolated to src/server/payment/**.",
        },
      ]),
    },
  },
]);

export default eslintConfig;
