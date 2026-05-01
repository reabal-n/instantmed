import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
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
    stripeWebhookSecret: "whsec_test",
    supabaseServiceRoleKey: "service-role",
    supabaseUrl: "https://test.supabase.co",
  },
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
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

describe("Stripe webhook admin replay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INTERNAL_API_SECRET = "internal-secret"
    mocks.createClient.mockReturnValue({ from: vi.fn(), rpc: vi.fn() })
    mocks.handler.mockResolvedValue(undefined)
  })

  it("marks admin replay context so handlers bypass prior event claims", async () => {
    const event = {
      data: {
        object: {
          id: "cs_test",
          metadata: { intake_id: "intake-1" },
          payment_status: "paid",
        },
      },
      id: "evt_test",
      type: "checkout.session.completed",
    }

    const response = await POST(new Request("https://instantmed.example/api/stripe/webhook", {
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Replay": "true",
        "X-Admin-Replay-Secret": "internal-secret",
        "X-Original-Event-Id": "evt_test",
      },
      method: "POST",
    }))

    expect(response.status).toBe(200)
    expect(mocks.handler).toHaveBeenCalledWith(expect.objectContaining({
      adminReplay: true,
      event: expect.objectContaining({ id: "evt_test" }),
    }))
  })
})
