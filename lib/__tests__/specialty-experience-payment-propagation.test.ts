import { describe, expect, it } from "vitest"

import { buildCheckoutSessionParams } from "@/lib/stripe/checkout/stripe-session"

describe("specialty experience payment propagation", () => {
  it("copies the authenticated intake cohort to Session and PaymentIntent metadata", () => {
    const params = buildCheckoutSessionParams({
      attribution: {
        adgroupid: null,
        campaignid: null,
        creative: null,
        device: null,
        gbraid: null,
        gclid: null,
        keyword: null,
        matchtype: null,
        network: null,
        utm_campaign: null,
        utm_id: null,
        utm_medium: null,
        utm_source: null,
        wbraid: null,
      },
      baseUrl: "https://instantmed.example",
      category: "consult",
      flowInstanceId: undefined,
      growthExperienceVersion: "spx_h1_20260828",
      intakeId: "intake-1",
      isPriority: false,
      patientEmail: "patient@example.test",
      patientId: "patient-1",
      posthogDistinctId: undefined,
      priceId: "price_hair",
      priorityPriceId: null,
      refCode: "",
      referralCoupon: null,
      serviceSlug: "mens-health-hair",
      stripeCustomerId: undefined,
      subtype: "hair_loss",
    })

    expect(params.metadata).toMatchObject({
      growth_experience_version: "spx_h1_20260828",
    })
    expect(params.payment_intent_data.metadata).toMatchObject({
      growth_experience_version: "spx_h1_20260828",
    })
  })
})
