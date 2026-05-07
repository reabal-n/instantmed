import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const baselineSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20240101000000_baseline.sql"),
  "utf8",
)
const templateSenderSource = readFileSync(
  join(process.cwd(), "lib/email/template-sender.ts"),
  "utf8",
)
const reconstructSource = readFileSync(
  join(process.cwd(), "lib/email/send/reconstruct.ts"),
  "utf8",
)

describe("email template slug contract", () => {
  it("uses the active database slugs for paid and refund email templates", () => {
    expect(baselineSource).toContain("'payment-received'")
    expect(baselineSource).toContain("'refund-processed'")

    expect(templateSenderSource).toContain('templateSlug: "payment-received"')
    expect(templateSenderSource).toContain('templateSlug: "refund-processed"')
    expect(reconstructSource).toContain('renderDatabaseTemplate("payment-received"')
    expect(reconstructSource).toContain('renderDatabaseTemplate("refund-processed"')
  })

  it("does not use the stale underscore slugs for active DB templates", () => {
    expect(templateSenderSource).not.toContain('templateSlug: "payment_received"')
    expect(templateSenderSource).not.toContain('templateSlug: "refund_processed"')
    expect(reconstructSource).not.toContain('renderDatabaseTemplate("payment_received"')
    expect(reconstructSource).not.toContain('renderDatabaseTemplate("refund_processed"')
  })
})
