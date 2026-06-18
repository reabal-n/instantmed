import { afterEach, describe, expect, it } from "vitest"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import {
  buildAbandonedCheckoutResumeUrl,
  buildCheckoutPaymentRecoveryUrl,
  buildExpiredCheckoutStartUrl,
} from "@/lib/email/recovery-links"

const APP_URL = "https://instantmed.com.au"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const ORIGINAL_SECRET = process.env.INTERNAL_API_SECRET

describe("abandoned checkout retry URL", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.INTERNAL_API_SECRET
    } else {
      process.env.INTERNAL_API_SECRET = ORIGINAL_SECRET
    }
  })

  it("links to the owned intake retry route with recovery attribution", () => {
    const url = buildAbandonedCheckoutResumeUrl({
      appUrl: APP_URL,
      campaign: "abandoned_checkout",
      intakeId: INTAKE_ID,
    })
    const parsed = new URL(url)

    expect(parsed.pathname).toBe(`/patient/intakes/${INTAKE_ID}`)
    expect(parsed.searchParams.get("retry")).toBe("true")
    expect(parsed.searchParams.get("utm_source")).toBe("recovery_email")
    expect(parsed.searchParams.get("utm_medium")).toBe("email")
    expect(parsed.searchParams.get("utm_campaign")).toBe("abandoned_checkout")
  })

  it("uses a distinct campaign for the follow-up email", () => {
    const url = buildAbandonedCheckoutResumeUrl({
      appUrl: `${APP_URL}/`,
      campaign: "abandoned_checkout_followup",
      intakeId: INTAKE_ID,
    })

    expect(new URL(url).searchParams.get("utm_campaign")).toBe("abandoned_checkout_followup")
  })

  it("builds authenticated payment-failure retry links through the owned intake route", () => {
    const url = buildCheckoutPaymentRecoveryUrl({
      appUrl: APP_URL,
      campaign: "payment_failed",
      intakeId: INTAKE_ID,
    })
    const parsed = new URL(url)

    expect(parsed.pathname).toBe(`/patient/intakes/${INTAKE_ID}`)
    expect(parsed.searchParams.get("retry")).toBe("true")
    expect(parsed.searchParams.get("utm_campaign")).toBe("payment_failed")
  })

  it("builds guest payment-failure retry links through a signed resume token", () => {
    process.env.INTERNAL_API_SECRET = "test-internal-secret"

    const url = buildCheckoutPaymentRecoveryUrl({
      appUrl: APP_URL,
      campaign: "async_payment_failed",
      intakeId: INTAKE_ID,
      isGuest: true,
    })
    const parsed = new URL(url)
    const token = decodeURIComponent(parsed.pathname.replace("/resume/", ""))

    expect(parsed.pathname).toMatch(/^\/resume\//)
    expect(parsed.searchParams.get("utm_campaign")).toBe("async_payment_failed")
    expect(verifyCheckoutResumeToken(token)).toEqual({ intakeId: INTAKE_ID })
  })

  it("sends terminal expired checkouts to a fresh service start path", () => {
    const url = buildExpiredCheckoutStartUrl({
      appUrl: APP_URL,
      campaign: "checkout_expired",
      category: "consult",
      subtype: "ed",
    })
    const parsed = new URL(url)

    expect(parsed.pathname).toBe("/request")
    expect(parsed.searchParams.get("service")).toBe("consult")
    expect(parsed.searchParams.get("subtype")).toBe("ed")
    expect(parsed.searchParams.get("utm_campaign")).toBe("checkout_expired")
  })
})
