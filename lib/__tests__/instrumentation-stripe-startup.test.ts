import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@sentry/nextjs", () => ({}))
vi.mock("@/lib/security/encryption", () => ({ verifyEncryptionSetup: () => ({ valid: true }) }))
vi.mock("@/lib/validation/schema-validation", () => ({ runSchemaValidation: vi.fn() }))
vi.mock("@/lib/observability/scrub-phi", () => ({}))
vi.mock("@/lib/observability/sentry-config", () => ({
  getSentryDsn: () => "", isSentryEnabled: () => false,
  getSentryEnvironment: () => "test", getSentryRelease: () => "test", getSentryRuntime: () => "nodejs",
}))

import { register } from "../../instrumentation"

describe("instrumentation Stripe startup guard", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: "production", NEXT_RUNTIME: "nodejs", ENCRYPTION_KEY: "synthetic",
      PLAYWRIGHT: "1", ALLOW_STRIPE_TEST_WEBHOOKS: "true",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3060", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3060",
      SUPABASE_URL: "http://127.0.0.1:55321", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
    })) vi.stubEnv(key, value)
    vi.stubEnv("VERCEL", undefined)
    vi.stubEnv("VERCEL_ENV", undefined)
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it.each(["sk_test_synthetic", "rk_test_synthetic"])("starts the isolated bundle with %s", async (key) => {
    vi.stubEnv("STRIPE_SECRET_KEY", key)
    await expect(register()).resolves.toBeUndefined()
  })

  it.each(["sk_test_synthetic", "rk_test_synthetic"])("rejects %s on deployed production even with test flags", async (key) => {
    vi.stubEnv("STRIPE_SECRET_KEY", key)
    vi.stubEnv("VERCEL", "1")
    await expect(register()).rejects.toThrow("Stripe test keys in production")
  })

  it("rejects a test key with a hosted database", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic")
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    await expect(register()).rejects.toThrow("Stripe test keys in production")
  })
})
