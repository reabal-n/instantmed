import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextVitals = compat.extends("next/core-web-vitals");
const nextTs = compat.extends("next/typescript");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Custom rules
  {
    rules: {
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
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores:
    "node_modules/**",
    "dist/**",
    "*.config.js",
    "*.config.mjs",
  ]),
]);

export default eslintConfig;
