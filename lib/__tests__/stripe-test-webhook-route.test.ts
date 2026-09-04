import type Stripe from "stripe"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  createClient: vi.fn(),
  handler: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  tryClaimEvent: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    get stripeWebhookSecret() {
      return "whsec_test"
    },
    get supabaseServiceRoleKey() {
      return "service-role"
    },
    get supabaseUrl() {
      return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    },
  },
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  },
}))

vi.mock("@/app/api/stripe/webhook/handlers", () => ({
  handlers: new Map([["checkout.session.completed", mocks.handler]]),
}))

vi.mock("@/app/api/stripe/webhook/handlers/utils", () => ({
  tryClaimEvent: mocks.tryClaimEvent,
}))

import { POST } from "@/app/api/stripe/webhook/route"

const managedEnvKeys = [
  "ALLOW_STRIPE_TEST_WEBHOOKS",
  "E2E_ISOLATED_SUPABASE",
  "INTERNAL_API_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NODE_ENV",
  "PLAYWRIGHT",
  "STRIPE_SECRET_KEY",
  "SUPABASE_URL",
  "VERCEL",
  "VERCEL_ENV",
] as const

const originalEnv = Object.fromEntries(
  managedEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof managedEnvKeys)[number], string | undefined>

function restoreManagedEnv() {
  for (const key of managedEnvKeys) {
    const value = originalEnv[key]
    if (value === undefined) Reflect.deleteProperty(process.env, key)
    else Reflect.set(process.env, key, value)
  }
}

function setCommonTestEnv(nodeEnv: "development" | "production" | "test") {
  Reflect.set(process.env, "NODE_ENV", nodeEnv)
  process.env.PLAYWRIGHT = "1"
  process.env.STRIPE_SECRET_KEY = "sk_test_example"
  process.env.SUPABASE_URL = "http://127.0.0.1:55321"
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321"
  delete process.env.VERCEL
  delete process.env.VERCEL_ENV
}

function stripeEvent(livemode: boolean): Stripe.Event {
  return {
    data: { object: {} },
    id: livemode ? "evt_live_signed" : "evt_test_signed",
    livemode,
    type: "checkout.session.completed",
  } as Stripe.Event
}

async function postSigned(url: string) {
  return POST(new Request(url, {
    body: "signed-body",
    headers: { "stripe-signature": "valid-signature" },
    method: "POST",
  }))
}

describe("Stripe webhook test-event route policy", () => {
  beforeEach(() => {
    restoreManagedEnv()
    vi.clearAllMocks()
    mocks.createClient.mockReturnValue({ from: vi.fn(), rpc: vi.fn() })
    mocks.handler.mockResolvedValue(undefined)
  })

  afterEach(() => {
    restoreManagedEnv()
  })

  it("processes a signed test event through the opted-in local production bundle", async () => {
    setCommonTestEnv("production")
    process.env.ALLOW_STRIPE_TEST_WEBHOOKS = "true"
    mocks.constructEvent.mockReturnValue(stripeEvent(false))

    const response = await postSigned("http://127.0.0.1:3060/api/stripe/webhook")

    expect(response.status).toBe(200)
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      "signed-body",
      "valid-signature",
      "whsec_test",
    )
    expect(mocks.createClient).toHaveBeenCalledOnce()
    expect(mocks.handler).toHaveBeenCalledOnce()
  })

  it("rejects an arbitrary hosted Supabase target before creating a service client", async () => {
    setCommonTestEnv("production")
    process.env.ALLOW_STRIPE_TEST_WEBHOOKS = "true"
    process.env.E2E_ISOLATED_SUPABASE = "1"
    process.env.SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co"
    mocks.constructEvent.mockReturnValue(stripeEvent(false))

    const response = await postSigned("http://127.0.0.1:3060/api/stripe/webhook")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(mocks.constructEvent).toHaveBeenCalledOnce()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.handler).not.toHaveBeenCalled()
  })

  it("preserves the signed Playwright development lane", async () => {
    setCommonTestEnv("development")
    mocks.constructEvent.mockReturnValue(stripeEvent(false))

    const response = await postSigned("http://localhost:3060/api/stripe/webhook")

    expect(response.status).toBe(200)
    expect(mocks.createClient).toHaveBeenCalledOnce()
    expect(mocks.handler).toHaveBeenCalledOnce()
  })

  it("does not apply the test policy to a signed live event", async () => {
    setCommonTestEnv("production")
    process.env.STRIPE_SECRET_KEY = "sk_live_example"
    process.env.SUPABASE_URL = "https://witzcrovsoumktyndqgz.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://witzcrovsoumktyndqgz.supabase.co"
    process.env.VERCEL = "1"
    process.env.VERCEL_ENV = "production"
    mocks.constructEvent.mockReturnValue(stripeEvent(true))

    const response = await postSigned("https://instantmed.com.au/api/stripe/webhook")

    expect(response.status).toBe(200)
    expect(mocks.createClient).toHaveBeenCalledOnce()
    expect(mocks.handler).toHaveBeenCalledOnce()
  })

  it("does not apply the test policy to an authenticated admin replay", async () => {
    setCommonTestEnv("production")
    process.env.INTERNAL_API_SECRET = "internal-secret"
    process.env.VERCEL = "1"
    process.env.VERCEL_ENV = "production"

    const event = stripeEvent(false)
    const response = await POST(new Request("https://instantmed.com.au/api/stripe/webhook", {
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Replay": "true",
        "X-Admin-Replay-Secret": "internal-secret",
        "X-Original-Event-Id": event.id,
      },
      method: "POST",
    }))

    expect(response.status).toBe(200)
    expect(mocks.constructEvent).not.toHaveBeenCalled()
    expect(mocks.createClient).toHaveBeenCalledOnce()
    expect(mocks.handler).toHaveBeenCalledWith(expect.objectContaining({ adminReplay: true }))
  })
})
