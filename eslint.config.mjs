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
      "next.config.mjs",
      "postcss.config.mjs",
      "tailwind.config.js",
      "**/*.d.ts",
      "public/sw.js",
      "playwright-report/**",
      "test-results/**",
      "scripts/**",
      ".worktrees/**",
      "tools/**",
    ],
  },
  // Base JS recommended
  js.configs.recommended,
  // TypeScript recommended
  ...tseslint.configs.recommended,
  // Expose the Next plugin at the flat-config root so `next build` can detect it
  // when it inspects eslint.config.mjs directly.
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
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
  // ── Design system enforcement: Morning Canvas v1.0.0 ─────────────────────
  // Catch prohibited patterns at lint-time. Hard failures — treat as errors.
  // Run `pnpm verify:tokens` for the equivalent shell-level audit.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // M2: Custom box-shadow arbitrary values — use canonical tokens instead.
        // Allowed exception: drop-shadow-[...] (CSS filter on SVG/text nodes).
        {
          selector: "Literal[value=/(?<![dD]rop-)shadow-\\[0_/]",
          message:
            "Design token violation (M2): replace shadow-[0_...] with shadow-{sm|md|lg|xl} shadow-{color}/{opacity}. See DESIGN.md §5.",
        },
        // M6-A: initial={false} on motion elements — must be initial={{}}.
        // AnimatePresence initial={false} is a valid boolean API prop — excluded here.
        {
          selector:
            "JSXOpeningElement:not([name.name='AnimatePresence']) > JSXAttribute[name.name='initial'][value.expression.value=false]",
          message:
            "Motion canon violation (M6-A): use initial={{}} instead of initial={false}. Only AnimatePresence accepts initial={false}.",
        },
        // M6-B: Spring physics in transitions — use { duration: 0.2, ease: 'easeOut' }.
        // Exception: useSpring MotionValues and mouse-tracking physics — see verify-tokens.sh allowlist.
        {
          selector: "Property[key.name='stiffness']",
          message:
            "Motion canon violation (M6-B): stiffness belongs only in useSpring MotionValues or mouse-tracking hooks — not entrance/exit transitions. Use { duration: 0.2, ease: 'easeOut' }.",
        },
        {
          selector: "Property[key.name='type'][value.value='spring']",
          message:
            "Motion canon violation (M6-B): type:'spring' not allowed in transitions. Use { duration: 0.2, ease: 'easeOut' }.",
        },
        // A11y: Contrast violation — opacity-modified text-muted-foreground on body text.
        // Detects `text-{xs|sm|base|[Npx]} ... text-muted-foreground/N` (forward) or the reverse order.
        // Decorative icons (w-/h- without text-size) are unaffected.
        {
          selector:
            "Literal[value=/\\btext-(xs|sm|base|\\[(?:9|10|11|12|13|14|15|16|17|18)px\\])\\b[^\"]*\\btext-muted-foreground\\/\\d+\\b/]",
          message:
            "Contrast violation: text-muted-foreground with opacity modifier on body text fails WCAG AA 4.5:1. Drop the /N modifier, or use a dedicated decorative token.",
        },
        {
          selector:
            "Literal[value=/\\btext-muted-foreground\\/\\d+\\b[^\"]*\\btext-(xs|sm|base|\\[(?:9|10|11|12|13|14|15|16|17|18)px\\])\\b/]",
          message:
            "Contrast violation: text-muted-foreground with opacity modifier on body text fails WCAG AA 4.5:1. Drop the /N modifier, or use a dedicated decorative token.",
        },
      ],
    },
  },
  // A11y rule exception: hero mockup decoration (parent is aria-hidden in hero variants).
  {
    files: ["components/marketing/mockups/**/*.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Intentional spring-physics exceptions: mouse-tracking interactions and animated counters.
  // These files use useSpring/damping for genuine physics UX — not entrance transitions.
  {
    files: [
      "components/ui/morning/perspective-tilt-card.tsx",
      "components/marketing/shared/interactive-product-mockup.tsx",
      "components/sections/stat-strip.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
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
