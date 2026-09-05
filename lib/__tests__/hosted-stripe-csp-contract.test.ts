import { afterEach, describe, expect, it, vi } from "vitest"

type HeaderRoute = { headers: { key: string; value: string }[] }
const localOrigin = "http://127.0.0.1:55321"
const ownedEnvironment = {
  NODE_ENV: "production",
  PLAYWRIGHT: "1",
  ALLOW_STRIPE_TEST_WEBHOOKS: "true",
  VERCEL: undefined,
  VERCEL_ENV: undefined,
  STRIPE_SECRET_KEY: "sk_test_fixture",
  NEXT_PUBLIC_APP_URL: "http://localhost:3060",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3060",
  SUPABASE_URL: localOrigin,
  NEXT_PUBLIC_SUPABASE_URL: localOrigin,
}

async function policies(overrides: Record<string, string | undefined> = {}) {
  for (const [name, value] of Object.entries({ ...ownedEnvironment, ...overrides })) {
    vi.stubEnv(name, value)
  }
  const { default: config } = await import("../../next.config.mjs") as {
    default: { headers(): Promise<HeaderRoute[]> }
  }
  return (await config.headers())[0].headers
    .filter(({ key }) => key.startsWith("Content-Security-Policy"))
    .map(({ value }) => value)
}

afterEach(() => vi.unstubAllEnvs())

describe("hosted Stripe local Auth CSP", () => {
  it("allows only the owned local Auth connection in both policies", async () => {
    const values = await policies()
    expect(values).toHaveLength(2)
    for (const policy of values) {
      const connection = policy.split(";").find((part) => part.trim().startsWith("connect-src "))
      expect(connection).toContain(localOrigin)
      expect(connection).not.toContain("http://localhost:*")
      expect(policy).not.toContain("'unsafe-eval'")
    }
  })

  it.each([
    { VERCEL: "1" }, { VERCEL: "" }, { VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" }, { PLAYWRIGHT: undefined },
    { ALLOW_STRIPE_TEST_WEBHOOKS: undefined }, { STRIPE_SECRET_KEY: "sk_live_fixture" },
    { NEXT_PUBLIC_APP_URL: "https://instantmed.com.au" },
    { NEXT_PUBLIC_SITE_URL: "https://instantmed.com.au" },
    { SUPABASE_URL: "https://example.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
  ])("does not widen CSP outside the owned runner: %j", async (overrides) => {
    for (const policy of await policies(overrides)) {
      expect(policy).not.toContain(localOrigin)
    }
  })
})
