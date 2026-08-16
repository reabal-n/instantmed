import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const refundsClientSource = readFileSync(
  join(process.cwd(), "app/admin/refunds/refunds-client.tsx"),
  "utf8",
)

describe("admin refund settlement copy", () => {
  it("distinguishes a requested refund from cash-confirmed settlement", () => {
    expect(refundsClientSource).toContain(
      '"pending" in result && result.pending\n            ? "Refund requested; settlement pending"\n            : "Refund already settled"',
    )
    expect(refundsClientSource).not.toContain('toast.success("Refund processed")')
    expect(refundsClientSource).toContain("Requests the full payment amount from Stripe")
    expect(refundsClientSource).toContain(
      'isProcessing ? "Requesting refund" : "Request refund"',
    )
  })
})
