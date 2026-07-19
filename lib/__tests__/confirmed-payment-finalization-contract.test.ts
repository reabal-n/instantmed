import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const adapters = [
  "app/api/stripe/webhook/handlers/checkout-session-completed.ts",
  "app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded.ts",
  "app/api/stripe/verify-payment/route.ts",
] as const

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("confirmed payment finalization ownership", () => {
  it.each(adapters)("%s delegates the paid transition to the shared finalizer", (path) => {
    const source = read(path)

    expect(source).toContain("finalizeConfirmedCheckoutPayment")
    expect(source).not.toMatch(/\.update\(\{[\s\S]{0,500}?payment_status:\s*"paid"/)
  })

  it("keeps the exact-current paid transition and Stripe amount reconciliation in one deep module", () => {
    const source = read("lib/stripe/confirmed-payment-finalization.ts")

    expect(source).toContain('amount_cents: session.amount_total')
    expect(source).toContain('.eq("payment_id", session.id)')
    expect(source).toContain('.in("status", ["pending_payment", "checkout_failed"])')
    expect(source).toContain('.in("payment_status", ["pending", "unpaid", "failed"])')
  })

  it("awards referral credits only after atomically claiming a non-credited event", () => {
    const source = read("lib/stripe/confirmed-payment-finalization.ts")

    expect(source).toContain('.eq("status", existing.status)')
    expect(source).toContain('.select("id")')
    expect(source).toContain("if (!claimedEvent) return")
  })
})
