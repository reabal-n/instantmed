import { describe, expect, it } from "vitest"

import {
  classifyStripeKeyMode,
  classifySupabaseTestTarget,
  mayProcessStripeTestEvent,
  mayStartLocalStripeTestBundle,
  type StripeTestEventPolicyInput,
} from "@/lib/stripe/test-webhook-policy"

describe("Stripe startup test-bundle exception", () => {
  const env = {
    NODE_ENV: "production", PLAYWRIGHT: "1", ALLOW_STRIPE_TEST_WEBHOOKS: "true",
    STRIPE_SECRET_KEY: "sk_test_synthetic",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3060",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3060",
    SUPABASE_URL: "http://127.0.0.1:55321",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
  } as const

  it.each(["sk_test_synthetic", "rk_test_synthetic"])("accepts the owned local runner with %s", (key) => {
    expect(mayStartLocalStripeTestBundle({ ...env, STRIPE_SECRET_KEY: key })).toBe(true)
  })

  it.each(Object.keys(env))("requires %s", (key) => {
    expect(mayStartLocalStripeTestBundle({ ...env, [key]: undefined })).toBe(false)
  })

  it.each([
    { VERCEL: "1" }, { VERCEL: "" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "" },
    { STRIPE_SECRET_KEY: "sk_live_synthetic" }, { STRIPE_SECRET_KEY: "unknown" },
    { PLAYWRIGHT: "0" }, { ALLOW_STRIPE_TEST_WEBHOOKS: "false" },
    { NEXT_PUBLIC_APP_URL: "https://instantmed.com.au" },
    { NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3061" },
    { NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3060/path" },
    { NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3060?token=synthetic" },
    { NEXT_PUBLIC_APP_URL: "http://user@127.0.0.1:3060" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://witzcrovsoumktyndqgz.supabase.co" },
    { SUPABASE_URL: "http://127.0.0.1:54321" },
    { SUPABASE_URL: "https://other.supabase.co", NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" },
  ])("rejects an environment outside the owned runner: %j", (override) => {
    expect(mayStartLocalStripeTestBundle({ ...env, ...override })).toBe(false)
  })
})

const hostedLocalInput: StripeTestEventPolicyInput = {
  allowTestWebhooks: true,
  eventLivemode: false,
  nodeEnv: "production",
  playwrightEnabled: true,
  requestHost: "localhost:3060",
  stripeKeyMode: "test",
  supabaseTarget: "local",
  supabaseUrlsMatch: true,
}

describe("Stripe test webhook policy", () => {
  it("permits a loopback production bundle only with every hosted-test control", () => {
    expect(mayProcessStripeTestEvent(hostedLocalInput)).toBe(true)
  })

  it("preserves the exact Playwright development and test readiness lanes", () => {
    for (const nodeEnv of ["development", "test"] as const) {
      expect(mayProcessStripeTestEvent({
        ...hostedLocalInput,
        allowTestWebhooks: false,
        nodeEnv,
        stripeKeyMode: "unknown",
        supabaseTarget: "unknown",
        supabaseUrlsMatch: false,
      })).toBe(true)
    }
  })

  it.each([
    ["missing explicit opt-in", { allowTestWebhooks: false }],
    ["missing Playwright marker", { playwrightEnabled: false }],
    ["live Stripe credential", { stripeKeyMode: "live" as const }],
    ["unknown Stripe credential", { stripeKeyMode: "unknown" as const }],
    ["production Supabase target", { supabaseTarget: "production" as const }],
    ["unknown Supabase target", { supabaseTarget: "unknown" as const }],
    ["mismatched Supabase URLs", { supabaseUrlsMatch: false }],
    ["non-loopback request", { requestHost: "instantmed.com.au" }],
    ["Vercel runtime marker", { vercel: "1" }],
    ["defined empty Vercel runtime marker", { vercel: "" }],
    ["Vercel production environment", { vercelEnv: "production" }],
    ["Vercel preview environment", { vercelEnv: "preview" }],
    ["Vercel development environment", { vercelEnv: "development" }],
    ["defined empty Vercel environment", { vercelEnv: "" }],
    ["unknown Node environment", { nodeEnv: "unknown" as const }],
  ])("rejects the hosted production bundle with %s", (_name, override) => {
    expect(mayProcessStripeTestEvent({ ...hostedLocalInput, ...override })).toBe(false)
  })

  it.each([
    ["development", { nodeEnv: "development" as const }],
    ["test", { nodeEnv: "test" as const }],
  ])("requires Playwright, loopback, and no Vercel marker in %s", (_name, override) => {
    expect(mayProcessStripeTestEvent({
      ...hostedLocalInput,
      ...override,
      playwrightEnabled: false,
    })).toBe(false)
    expect(mayProcessStripeTestEvent({
      ...hostedLocalInput,
      ...override,
      requestHost: "example.com",
    })).toBe(false)
    expect(mayProcessStripeTestEvent({
      ...hostedLocalInput,
      ...override,
      vercelEnv: "development",
    })).toBe(false)
  })

  it("leaves live events on the normal verified-signature path", () => {
    expect(mayProcessStripeTestEvent({
      ...hostedLocalInput,
      eventLivemode: true,
      playwrightEnabled: false,
      requestHost: "instantmed.com.au",
      stripeKeyMode: "live",
      supabaseTarget: "production",
      vercel: "1",
      vercelEnv: "production",
    })).toBe(true)
  })
})

describe("Stripe key mode classification", () => {
  it.each([
    ["sk_test_example", "test"],
    ["rk_test_example", "test"],
    ["sk_live_example", "live"],
    ["rk_live_example", "live"],
    ["pk_test_example", "unknown"],
    ["", "unknown"],
    [undefined, "unknown"],
  ] as const)("classifies %s without guessing", (key, expected) => {
    expect(classifyStripeKeyMode(key)).toBe(expected)
  })
})

describe("Supabase test target classification", () => {
  it("accepts matching loopback origins and the server-URL fallback", () => {
    expect(classifySupabaseTestTarget({
      publicUrl: "http://127.0.0.1:55321",
      serverUrl: "http://127.0.0.1:55321/",
    })).toEqual({ supabaseTarget: "local", supabaseUrlsMatch: true })

    expect(classifySupabaseTestTarget({
      publicUrl: "http://localhost:55321",
    })).toEqual({ supabaseTarget: "local", supabaseUrlsMatch: true })
  })

  it("does not infer that an arbitrary hosted project is non-production", () => {
    expect(classifySupabaseTestTarget({
      publicUrl: "https://abcdefghijklmnopqrst.supabase.co",
      serverUrl: "https://abcdefghijklmnopqrst.supabase.co/",
    })).toEqual({ supabaseTarget: "unknown", supabaseUrlsMatch: false })
  })

  it("identifies the InstantMed production project", () => {
    expect(classifySupabaseTestTarget({
      publicUrl: "https://witzcrovsoumktyndqgz.supabase.co",
      serverUrl: "https://witzcrovsoumktyndqgz.supabase.co",
    })).toEqual({ supabaseTarget: "production", supabaseUrlsMatch: true })
  })

  it.each([
    [
      "different hosted projects",
      "https://abcdefghijklmnopqrst.supabase.co",
      "https://bcdefghijklmnopqrstu.supabase.co",
    ],
    ["different local ports", "http://127.0.0.1:55321", "http://127.0.0.1:54321"],
    ["custom domains", "https://db.example.com", "https://db.example.com"],
    ["production domains", "https://instantmed.com.au", "https://instantmed.com.au"],
    ["URL paths", "http://127.0.0.1:55321/rest/v1", "http://127.0.0.1:55321/rest/v1"],
    ["malformed URLs", "not-a-url", "not-a-url"],
  ])("rejects %s", (_name, serverUrl, publicUrl) => {
    const result = classifySupabaseTestTarget({ publicUrl, serverUrl })
    expect(result.supabaseUrlsMatch).toBe(false)
    expect(result.supabaseTarget).toBe("unknown")
  })
})
