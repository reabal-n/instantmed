import { afterEach, describe, expect, it } from "vitest"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import {
  buildGuestCheckoutCancelUrl,
  CHECKOUT_RESUME_TOKEN_PARAM,
} from "@/lib/stripe/checkout-recovery-link"

const APP_URL = "https://instantmed.com.au"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const ORIGINAL_SECRET = process.env.INTERNAL_API_SECRET

describe("guest checkout cancel URL", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.INTERNAL_API_SECRET
    } else {
      process.env.INTERNAL_API_SECRET = ORIGINAL_SECRET
    }
  })

  it("includes a signed resume token for guest payment recovery", () => {
    process.env.INTERNAL_API_SECRET = "test-internal-secret"

    const url = buildGuestCheckoutCancelUrl({
      baseUrl: APP_URL,
      intakeId: INTAKE_ID,
    })
    const parsed = new URL(url)
    const resumeToken = parsed.searchParams.get(CHECKOUT_RESUME_TOKEN_PARAM)

    expect(parsed.pathname).toBe("/checkout/cancelled")
    expect(parsed.searchParams.get("intake_id")).toBe(INTAKE_ID)
    expect(resumeToken).toBeTruthy()
    expect(verifyCheckoutResumeToken(resumeToken!)).toEqual({ intakeId: INTAKE_ID })
  })

  it("falls back to the cancelled page when the token secret is unavailable", () => {
    delete process.env.INTERNAL_API_SECRET

    const url = buildGuestCheckoutCancelUrl({
      baseUrl: `${APP_URL}/`,
      intakeId: INTAKE_ID,
    })
    const parsed = new URL(url)

    expect(parsed.pathname).toBe("/checkout/cancelled")
    expect(parsed.searchParams.get("intake_id")).toBe(INTAKE_ID)
    expect(parsed.searchParams.get(CHECKOUT_RESUME_TOKEN_PARAM)).toBeNull()
  })
})
