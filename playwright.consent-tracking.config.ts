import { defineConfig, devices } from "@playwright/test"

// Dedicated local SDK test. Analytics is enabled with a fake key and every
// analytics request is intercepted; server-side external I/O is denied too.
const env = {
  PATH: process.env.PATH || "",
  NODE_ENV: "development", __NEXT_PROCESSED_ENV: "true",
  PLAYWRIGHT: "1", NEXT_PUBLIC_PLAYWRIGHT: "0",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_local_consent_test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3060",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3079",
  SUPABASE_URL: "http://127.0.0.1:3079",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-action-anon",
  SUPABASE_SERVICE_ROLE_KEY: "test-action-service",
  STRIPE_SECRET_KEY: "action_fixture_not_a_provider_key",
  SENTRY_DSN: "", NEXT_PUBLIC_SENTRY_DSN: "",
  RESEND_API_KEY: "", ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "",
  AI_GATEWAY_API_KEY: "", VERCEL_AI_GATEWAY_API_KEY: "",
}
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
const isolated = (command: string) => `env -i ${Object.entries(env).map(([key, value]) => `${key}=${quote(value)}`).join(" ")} ${quote(process.execPath)} ${command}`

export default defineConfig({
  testDir: "./e2e", testMatch: "checkout-consent.browser.ts",
  workers: 1, retries: 0, timeout: 90_000, reporter: "list",
  outputDir: "test-results/checkout-consent-tracking",
  use: { baseURL: "http://localhost:3060", trace: "retain-on-failure" },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
  ],
  webServer: [
    { command: isolated("scripts/e2e/action-access-backend.mjs"), url: "http://127.0.0.1:3079/health", reuseExistingServer: false },
    { command: isolated("--import ./scripts/e2e/action-access-isolation.mjs node_modules/next/dist/bin/next dev --port 3060"), url: "http://localhost:3060", reuseExistingServer: false, timeout: 120_000 },
  ],
})
