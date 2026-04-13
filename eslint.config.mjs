import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Global ignores must come first
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      "dist/**",
      "*.config.js",
      "*.config.mjs",
      "**/*.d.ts",
      "public/sw.js",
      "playwright-report/**",
      "test-results/**",
      "scripts/**",
      ".worktrees/**",
    ],
  },
  // Base JS recommended
  js.configs.recommended,
  // TypeScript recommended
  ...tseslint.configs.recommended,
  // React and Next.js rules
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Next.js rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Prevent console statements in production code
      "no-console": "error",
      // Prevent debugger statements
      "no-debugger": "error",
      // Prevent alert, confirm, prompt
      "no-alert": "error",
      // Warn on unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      // Prevent explicit any types
      "@typescript-eslint/no-explicit-any": "warn",
      // Prevent @ts-ignore
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10
        }
      ],
      // Allow lexical declarations in case blocks (common React pattern)
      "no-case-declarations": "off",
      // Import sorting
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    }
  },
  // Import boundary: lib/ must not import from components/ or app/
  // Exception: lib/__tests__/ can import from components/ and app/ for testing
  {
    files: ["lib/**/*.ts", "lib/**/*.tsx"],
    ignores: ["lib/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/components/*", "@/components/**"],
            message: "lib/ must not import from components/. Extract shared logic to lib/.",
          },
          {
            group: ["@/app/*", "@/app/**"],
            message: "lib/ must not import from app/. Move shared logic to lib/.",
          },
        ],
      }],
    },
  },
  // Import boundary: components/ must not import from app/ (except server actions)
  // Server actions in app/actions/ are designed to be called from components (standard Next.js pattern).
  {
    files: ["components/**/*.ts", "components/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/app/api/*", "@/app/api/**",
              "@/app/*/page", "@/app/*/page.*",
              "@/app/*/*/page", "@/app/*/*/page.*",
              "@/app/*/layout", "@/app/*/layout.*",
              "@/app/*/*/layout", "@/app/*/*/layout.*",
            ],
            message: "components/ must not import from app/ route handlers or pages. Move shared logic to lib/ or a shared types file.",
          },
        ],
      }],
    },
  },
  // Import boundary: types/ must be pure type definitions — no runtime imports
  {
    files: ["types/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/lib/*", "@/lib/**"],
            message: "types/ must not import runtime code from lib/. Keep type files pure.",
          },
          {
            group: ["@/components/*", "@/components/**"],
            message: "types/ must not import from components/.",
          },
          {
            group: ["@/app/*", "@/app/**"],
            message: "types/ must not import from app/.",
          },
        ],
      }],
    },
  },
];

export default eslintConfig;
