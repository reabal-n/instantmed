import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const guestCheckoutSource = readFileSync(
  join(process.cwd(), "lib/stripe/guest-checkout.ts"),
  "utf8",
)
const checkoutResumeSource = readFileSync(
  join(process.cwd(), "app/resume/[token]/page.tsx"),
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
    expect(checkoutResumeSource).toContain("buildGuestCheckoutCancelUrl({ baseUrl, intakeId: intake.id })")
    expect(checkoutRecoveryLinkSource).toContain('new URL("/checkout/cancelled", baseUrl)')
    expect(publicCancelledPageSource).toContain("PaymentCancelledContent")
    expect(publicCancelledPageSource).toContain("CHECKOUT_RESUME_TOKEN_PARAM")
    expect(cancelledPageSource).toContain("resumeToken")
    expect(cancelledPageSource).toContain("Resume secure checkout")
    expect(guestCheckoutSource).not.toContain("/patient/intakes/cancelled?intake_id=${intake.id}")
    expect(checkoutResumeSource).not.toContain("/patient/intakes/cancelled?intake_id=${intake.id}")
  })
})
