import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502010500_fix_stuck_intake_delivery_failure_priority.sql",
)
const OPS_DOC_PATH = join(process.cwd(), "docs/OPERATIONS.md")
const INTAKE_OPS_PATH = join(process.cwd(), "lib/data/intake-ops.ts")

const DELIVERY_EMAIL_TYPES = [
  "request_approved",
  "certificate_delivery",
  "med_cert_patient",
  "script_sent",
] as const

describe("stuck intakes view contract", () => {
  it("classifies failed delivery emails before generic delivery pending", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    const failedIndex = sql.indexOf("THEN 'delivery_failed'")
    const pendingIndex = sql.indexOf("THEN 'delivery_pending'")

    expect(sql).toContain("DROP VIEW IF EXISTS public.v_stuck_intakes")
    expect(sql).toContain("CREATE VIEW public.v_stuck_intakes")
    expect(failedIndex).toBeGreaterThan(-1)
    expect(pendingIndex).toBeGreaterThan(-1)
    expect(failedIndex).toBeLessThan(pendingIndex)
  })

  it("keeps delivery-failure email types aligned across code, view, and operations runbook", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")
    const opsDoc = readFileSync(OPS_DOC_PATH, "utf8")
    const intakeOps = readFileSync(INTAKE_OPS_PATH, "utf8")

    for (const emailType of DELIVERY_EMAIL_TYPES) {
      expect(intakeOps).toContain(`"${emailType}"`)
      expect(sql).toContain(`'${emailType}'`)
      expect(opsDoc).toContain(`'${emailType}'`)
    }
  })
})
