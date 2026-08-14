import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const script = readFileSync(
  join(process.cwd(), "scripts/backfill-stripe-refund-events.ts"),
  "utf8",
)

describe("Stripe refund ledger backfill script contract", () => {
  it("reads exact paginated Refund objects and never invokes a money mutation", () => {
    expect(script).toContain("for await (const refund of stripe.refunds.list")
    expect(script).toContain('"data.balance_transaction"')
    expect(script).toContain('"data.failure_balance_transaction"')
    expect(script).not.toMatch(/stripe\.refunds\.(?:create|update|cancel)/)
    expect(script).not.toMatch(/stripe\.(?:paymentIntents|charges)\.(?:create|update|cancel|capture)/)
  })

  it("is write-opt-in and limits database reads to non-PHI linkage fields", () => {
    expect(script).toContain("options.apply")
    expect(script).toContain('.select("id, stripe_payment_intent_id")')
    expect(script).not.toMatch(/patient|email|metadata/)
    expect(script).toContain("summarizeStripeRefundBackfill")
    expect(script).toContain('.in("evidence_key"')
    expect(script).toContain("hasSameStripeRefundEvidence")
  })
})
