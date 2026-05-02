import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { REPEAT_RX_SUBSCRIPTIONS_ACTIVE } from "@/lib/config/subscriptions"
import { transformAnswersForUnifiedCheckout } from "@/lib/request/unified-checkout"

describe("repeat Rx subscription dormancy", () => {
  it("keeps repeat prescription subscriptions inactive until the business model is reactivated", () => {
    expect(REPEAT_RX_SUBSCRIPTIONS_ACTIVE).toBe(false)

    const transformed = transformAnswersForUnifiedCheckout("repeat-script", {
      subscribeAndSave: true,
      medicationName: "Test medicine",
      medicationStrength: "10mg",
      medicationForm: "tablet",
    })

    expect(transformed.subscribe_and_save).toBe(false)
  })

  it("does not promote dormant subscriptions in the active request review or checkout UI", () => {
    const checkoutStep = readFileSync(
      join(process.cwd(), "components/request/steps/checkout-step.tsx"),
      "utf8",
    )
    const reviewStep = readFileSync(
      join(process.cwd(), "components/request/steps/review-step.tsx"),
      "utf8",
    )

    expect(checkoutStep).not.toContain("Subscribe &amp; save")
    expect(reviewStep).not.toContain("Subscribe &amp; save")
  })
})
