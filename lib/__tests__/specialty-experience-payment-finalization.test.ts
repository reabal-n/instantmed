import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  capturePersonlessPostHogEvent: vi.fn(),
  sendPaidRequestTelegramNotification: vi.fn(),
  startPostPaymentReviewWork: vi.fn(),
  trackIntakeFunnelStep: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/analytics/google-ads-post-payment", () => ({
  GOOGLE_ADS_ATTRIBUTION_SELECT:
    "category, subtype, gclid, gbraid, wbraid, utm_source, utm_medium, utm_id, utm_campaign, utm_content, campaignid, adgroupid, creative, matchtype, device, network, referrer, landing_page",
  runGoogleAdsPostPaymentAttribution: vi.fn(),
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: mocks.capturePersonlessPostHogEvent,
  trackIntakeFunnelStep: mocks.trackIntakeFunnelStep,
}))

vi.mock("@/lib/config/env", () => ({
  env: { appUrl: "https://instantmed.example" },
}))

vi.mock("@/lib/notifications/paid-request-telegram", () => ({
  sendPaidRequestTelegramNotification:
    mocks.sendPaidRequestTelegramNotification,
}))

vi.mock("@/lib/notifications/service", () => ({
  notifyPaymentReceived: vi.fn(),
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("@/lib/stripe/post-payment", () => ({
  startPostPaymentReviewWork: mocks.startPostPaymentReviewWork,
}))

import { completeConfirmedPaymentWork } from "@/lib/stripe/confirmed-payment-finalization"

describe("specialty experience payment finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendPaidRequestTelegramNotification.mockResolvedValue(undefined)
    mocks.startPostPaymentReviewWork.mockResolvedValue(undefined)
  })

  it("uses the database cohort ahead of conflicting Checkout Session metadata", async () => {
    const attribution = {
      adgroupid: null,
      campaignid: null,
      category: "consult",
      creative: null,
      device: null,
      flow_instance_id: null,
      gbraid: null,
      gclid: null,
      growth_experience_version: "spx_h1_20260828",
      landing_page: null,
      matchtype: null,
      network: null,
      referrer: null,
      subtype: "hair_loss",
      utm_campaign: null,
      utm_content: null,
      utm_id: null,
      utm_medium: null,
      utm_source: null,
      wbraid: null,
    }
    const query = {
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: attribution, error: null })),
    }
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    }

    await completeConfirmedPaymentWork({
      finalizationKind: "settled",
      generateDraftsForIntake: vi.fn(async () => ({ success: true })),
      intakeId: "intake-1",
      patientId: null,
      schedule: vi.fn(),
      serviceCategory: "consult",
      session: {
        amount_total: 4995,
        currency: "aud",
        customer: null,
        id: "cs_paid",
        metadata: {
          category: "consult",
          growth_experience_version: "spx_h3_20260828",
          service_slug: "mens-health-hair",
          subtype: "hair_loss",
        },
        payment_intent: "pi_paid",
        payment_method_types: ["card"],
        payment_status: "paid",
      } as never,
      source: "checkout_session_completed",
      supabase: supabase as never,
    })

    expect(mocks.trackIntakeFunnelStep).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          growth_experience_version: "spx_h1_20260828",
        }),
      }),
    )
    expect(mocks.capturePersonlessPostHogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "purchase_completed_server",
        properties: expect.objectContaining({
          growth_experience_version: "spx_h1_20260828",
        }),
      }),
    )
  })
})
