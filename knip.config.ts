import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: [
    // MDX guides and the service worker are runtime-loaded rather than imported.
    "content/blog/*.mdx!",
    "public/sw.js!",
    // Preview and fixture tooling belongs to the comprehensive scan only.
    "playwright.preview.config.ts",
    "scripts/e2e/{seed,teardown}.ts",
  ],
  project: [
    "app/**/*.{ts,tsx}!",
    "components/**/*.{ts,tsx}!",
    "hooks/**/*.{ts,tsx}!",
    "lib/**/*.{ts,tsx}!",
    "types/**/*.ts!",
    "content/**/*.mdx!",
    "middleware.ts!",
    "instrumentation.ts!",
    "instrumentation-client.ts!",
    "public/**/*.js!",
    "scripts/**/*.{ts,mjs,js}",
    "e2e/**/*.ts",
  ],
  // Standalone MCP servers have their own process entrypoints outside the app.
  ignore: ["tools/*-mcp-server/**"],
  ignoreFiles: [
    // Reserved gated surface kept for the explicitly deferred weight-loss launch.
    "app/weight-loss/weight-loss-client.tsx",
    // Clinical reference module retained for the next medication-guidance tranche.
    "lib/clinical/medication-guidance.ts",
    // Design-version sentinel is read by external drift tooling, not app imports.
    "lib/design-system/version.ts",
  ],
  ignoreDependencies: [
    // Next/Sentry instrumentation loads these packages through runtime hooks.
    "@svgr/webpack",
    "import-in-the-middle",
    "require-in-the-middle",
  ],
  // These executables are supplied externally in CI or operator environments.
  ignoreBinaries: ["supabase", "cwebp", "ffmpeg", "pdftotext"],
}

export default config
