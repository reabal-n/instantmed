import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const cancelIntakeSource = readFileSync(
  join(process.cwd(), "app/actions/cancel-intake.ts"),
  "utf8",
)

describe("cancel intake mutation contract", () => {
  it("keeps the nullable payment guard out of the PostgREST PATCH or filter", () => {
    expect(cancelIntakeSource).not.toContain(".or(`payment_status.is.null")
    expect(cancelIntakeSource).toContain('.is("payment_status", null)')
    expect(cancelIntakeSource).toContain(
      '.not("payment_status", "in", terminalPaidPaymentStatusesFilter)',
    )
  })
})
