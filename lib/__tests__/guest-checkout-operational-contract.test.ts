import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const guestCheckoutSource = readFileSync(
  join(process.cwd(), "lib/stripe/guest-checkout.ts"),
  "utf8",
)
const authenticatedCheckoutSource = readFileSync(
  join(process.cwd(), "lib/stripe/checkout.ts"),
  "utf8",
)
const checkoutResumeSource = readFileSync(
  join(process.cwd(), "app/resume/[token]/route.ts"),
  "utf8",
)
const guestResumeSource = readFileSync(
  join(process.cwd(), "lib/stripe/checkout/guest-resume.ts"),
  "utf8",
)
const checkoutRecoveryLinkSource = readFileSync(
  join(process.cwd(), "lib/stripe/checkout-recovery-link.ts"),
  "utf8",
)
const publicCancelledPageSource = readFileSync(
  join(process.cwd(), "app/checkout/cancelled/page.tsx"),
  "utf8",
)
const cancelledPageSource = readFileSync(
  join(process.cwd(), "components/checkout/payment-cancelled-content.tsx"),
  "utf8",
)

describe("guest checkout operational contract", () => {
  it("preserves failed guest checkout intakes for operator visibility", () => {
    const paymentSection = guestCheckoutSource.slice(
      guestCheckoutSource.indexOf("// 5. Validate price ID"),
    )
    expect(paymentSection).not.toContain('.from("intakes").delete()')
    expect(guestCheckoutSource).toContain('status: "checkout_failed"')
  })

  it("keeps cancelled guest checkout recoverable without requiring a patient login first", () => {
    expect(guestCheckoutSource).toContain("buildGuestCheckoutCancelUrl({ baseUrl, intakeId: intake.id })")
    expect(guestResumeSource).toContain("buildGuestCheckoutCancelUrl({ baseUrl, intakeId: intake.id })")
    expect(checkoutResumeSource).toContain("resolveGuestCheckoutResume")
    expect(checkoutResumeSource).toContain('export const dynamic = "force-dynamic"')
    expect(checkoutResumeSource).toContain('"X-Robots-Tag": "noindex, nofollow"')
    expect(checkoutRecoveryLinkSource).toContain('new URL("/checkout/cancelled", baseUrl)')
    expect(publicCancelledPageSource).toContain("PaymentCancelledContent")
    expect(publicCancelledPageSource).toContain("CHECKOUT_RESUME_TOKEN_PARAM")
    expect(cancelledPageSource).toContain("resumeToken")
    expect(cancelledPageSource).toContain("Resume secure checkout")
    expect(guestCheckoutSource).not.toContain("/patient/intakes/cancelled?intake_id=${intake.id}")
    expect(guestResumeSource).not.toContain("/patient/intakes/cancelled?intake_id=${intake.id}")
  })

  it("routes duplicate guest recovery through the shared session classifier and attach guard", () => {
    const rebuildSection = guestCheckoutSource.slice(
      guestCheckoutSource.indexOf("async function rebuildExpiredGuestSession"),
      guestCheckoutSource.indexOf("async function markGuestCheckoutFailed"),
    )
    const duplicateSection = guestCheckoutSource.slice(
      guestCheckoutSource.indexOf("if (intakeError || !intake)"),
      guestCheckoutSource.indexOf('logger.error("Failed to create intake"'),
    )

    expect(rebuildSection).toContain("invalidateCheckoutSessionForSafety")
    expect(rebuildSection).toContain("attachCheckoutSession")
    expect(rebuildSection).toContain("guest-duplicate-resume-v2_")
    expect(guestResumeSource).toContain("signed-guest-resume-v2_")
    expect(rebuildSection).not.toContain("`resume_${intake.id}_")
    expect(guestResumeSource).not.toContain("`resume_${intake.id}_")
    expect(rebuildSection).not.toContain('.update({\n        payment_id: session.id')
    expect(duplicateSection).toContain("inspectCheckoutSession")
    expect(duplicateSection).not.toContain("stripe.checkout.sessions.retrieve")
    expect(duplicateSection).toContain("payment_id, checkout_error, category")
    expect(duplicateSection).toContain(
      "isPaymentSafetyLock(existingIntake.checkout_error)",
    )
    expect(duplicateSection.indexOf("isPaymentSafetyLock")).toBeLessThan(
      duplicateSection.indexOf("inspectCheckoutSession"),
    )
    expect(duplicateSection).toContain("confirmCheckoutSessionStillCurrent")
    expect(rebuildSection).toContain("confirmCheckoutSessionStillCurrent")
  })

  it("preflights persisted Priority recovery before claim, invalidation, or Session creation", () => {
    const rebuildSection = guestCheckoutSource.slice(
      guestCheckoutSource.indexOf("async function rebuildExpiredGuestSession"),
      guestCheckoutSource.indexOf("async function markGuestCheckoutFailed"),
    )
    const preflightIndex = rebuildSection.indexOf("preflightPriorityPriceForRecovery")

    expect(preflightIndex).toBeGreaterThanOrEqual(0)
    expect(preflightIndex).toBeLessThan(
      rebuildSection.indexOf("claimCheckoutSessionReplacement"),
    )
    expect(preflightIndex).toBeLessThan(
      rebuildSection.indexOf("invalidateCheckoutSessionForSafety"),
    )
    expect(preflightIndex).toBeLessThan(
      rebuildSection.indexOf("stripe.checkout.sessions.create"),
    )
    expect(rebuildSection).toMatch(
      /if \(!priorityPreflight\.ok\) return null[\s\S]*priorityPreflight\.priceId/,
    )
    expect(rebuildSection).not.toContain(
      'isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null',
    )
  })

  it("does not let the initial Priority env guard bypass duplicate recovery", () => {
    expect(
      guestCheckoutSource.indexOf("if (isPriority && !priorityPriceId)"),
    ).toBeGreaterThan(
      guestCheckoutSource.indexOf("if (intakeError || !intake)"),
    )
  })

  it("keeps a new Priority config failure recoverable instead of deleting its intake", () => {
    const priorityGuardIndex = guestCheckoutSource.indexOf(
      "if (isPriority && !priorityPriceId)",
    )
    const priorityFailureSection = guestCheckoutSource.slice(
      priorityGuardIndex,
      guestCheckoutSource.indexOf("// 6. Build success and cancel URLs"),
    )

    expect(priorityGuardIndex).toBeGreaterThan(
      guestCheckoutSource.indexOf("// 5. Validate price ID"),
    )
    expect(priorityFailureSection).toContain("markGuestCheckoutFailed")
    expect(priorityFailureSection).toContain("reportCheckoutSessionFailure")
    expect(priorityFailureSection).toContain('failedPriceRole: "priority_fee"')
    expect(priorityFailureSection).not.toContain('.from("intakes")\n        .delete()')
  })

  it("binds both initial checkout sessions through the exact-CAS shared helper", () => {
    const guestInitialBind = guestCheckoutSource.slice(
      guestCheckoutSource.indexOf("// 8. Bind the current exact-CAS winner"),
    )
    const authenticatedInitialBind = authenticatedCheckoutSource.slice(
      authenticatedCheckoutSource.indexOf("// 11. Bind the exact current winner"),
    )

    for (const source of [guestInitialBind, authenticatedInitialBind]) {
      expect(source).toContain("attachCheckoutSession")
      expect(source).toContain("expectedPaymentId: null")
      expect(source).not.toContain(".update({ payment_id:")
    }
  })

  it("keeps signed resume reads on the encrypted-first answer helper", () => {
    expect(guestResumeSource).toContain("getIntakeAnswersForPaymentSafety(intake.id)")
    expect(guestResumeSource).not.toContain("answers:intake_answers(answers)")
  })
})
