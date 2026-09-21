import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: [
    // MDX guides and the service worker are runtime-loaded rather than imported.
    "content/blog/*.mdx!",
    "public/sw.js!",
    // Google Ads operations run through this standalone operator CLI entrypoint.
    "scripts/google-ads-agent.ts",
    // Aggregate customer-growth evidence runs through this standalone audit CLI.
    "scripts/customer-growth-baseline.ts!",
    // Release-friction evidence runs through this standalone audit CLI.
    "scripts/release-friction-readout.ts!",
    // Refund-ledger reconciliation runs through this standalone operator CLI.
    "scripts/backfill-stripe-refund-events.ts!",
    // Preview and fixture tooling belongs to the comprehensive scan only.
    "playwright.preview.config.ts",
    "playwright.action-access.config.ts",
    "playwright.consent-tracking.config.ts",
    "e2e/checkout-consent.browser.ts",
    // Spawned with a clean environment by the compiled-action test configuration.
    "scripts/e2e/action-access-backend.mjs",
    "scripts/e2e/action-access-isolation.mjs",
    "scripts/e2e/{seed,teardown}.ts",
    "scripts/test-navigation-bootstrap-browser.mjs",
    "scripts/fixtures/navigation-bootstrap-browser.tsx",
    "scripts/test-request-access-browser.mjs",
    "scripts/fixtures/request-access-browser.tsx",
    "scripts/test-streamed-content-browser.mjs",
    "scripts/fixtures/streamed-content-browser.jsx",
    "scripts/test-checkout-restored-browser.mjs",
    "scripts/fixtures/checkout-restored-browser.tsx",
    "scripts/test-parchment-workspace-browser.mjs",
    "scripts/test-prescription-history-browser.mjs",
    "scripts/fixtures/prescription-history-browser.tsx",
    "scripts/fixtures/parchment-workspace-browser.tsx",
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
    // Tailwind v4 is loaded from CSS and the PostCSS plugin, not a TS import.
    "tailwindcss",
  ],
  // These executables are supplied externally in CI or operator environments.
  ignoreBinaries: ["supabase", "cwebp", "ffmpeg", "pdftotext"],
}

export default config
