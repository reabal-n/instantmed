import { defineConfig } from "@playwright/test"

// No global setup, dotenv fallback, hosted DB, provider keys, or persistent data.
// The companion HTTP backend proves compiled application guards only, not RLS.
const appPort = 3060
const backendPort = 3079
const baseURL = `http://127.0.0.1:${appPort}`
const databaseURL = `http://127.0.0.1:${backendPort}`
const env = {
  PATH: process.env.PATH || "",
  NODE_ENV: "production", __NEXT_PROCESSED_ENV: "true",
  ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", AI_GATEWAY_API_KEY: "", VERCEL_AI_GATEWAY_API_KEY: "",
  PLAYWRIGHT: "1", NEXT_PUBLIC_PLAYWRIGHT: "1", PLAYWRIGHT_SERVER_MODE: "production",
  NEXT_PUBLIC_APP_URL: baseURL, NEXT_PUBLIC_SUPABASE_URL: databaseURL, SUPABASE_URL: databaseURL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-action-anon", SUPABASE_SERVICE_ROLE_KEY: "test-action-service",
  E2E_SECRET: "test-action-e2e-secret", INTERNAL_API_SECRET: "test-action-internal-secret-long-enough",
  ENCRYPTION_KEY: "a".repeat(64), PHI_MASTER_KEY: Buffer.alloc(32, 1).toString("base64"),
}
// The spec uses this same isolated environment. Child processes start through
// env -i so a real provider key can never leak into a failed guard's code path.
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY", "VERCEL_AI_GATEWAY_API_KEY"]) delete process.env[key]
Object.assign(process.env, env)
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
const isolated = (command: string) => `env -i ${Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`).join(" ")} ${shellQuote(process.execPath)} ${command}`

export default defineConfig({
  testDir: "./e2e", testMatch: "server-action-access.spec.ts", fullyParallel: false, workers: 1, retries: 0,
  reporter: "list", outputDir: "test-results/action-access", timeout: 120_000,
  use: { baseURL, trace: "off", video: "off", screenshot: "off" },
  webServer: [
    { command: isolated("scripts/e2e/action-access-backend.mjs"), url: `${databaseURL}/health`, reuseExistingServer: false },
    { command: isolated(`--import ./scripts/e2e/action-access-isolation.mjs node_modules/next/dist/bin/next start --port ${appPort}`), url: baseURL, reuseExistingServer: false, timeout: 120_000 },
  ],
})
