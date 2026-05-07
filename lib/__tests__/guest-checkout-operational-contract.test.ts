import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const guestCheckoutSource = readFileSync(
  join(process.cwd(), "lib/stripe/guest-checkout.ts"),
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
})
