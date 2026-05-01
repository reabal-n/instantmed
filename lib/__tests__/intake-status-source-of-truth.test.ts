import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { formatIntakeStatus } from "@/lib/data/intakes/format"
import { INTAKE_STATUS, PAYMENT_STATUS } from "@/lib/data/status"

const CANONICAL_INTAKE_STATUSES = [
  "draft",
  "pending_payment",
  "checkout_failed",
  "paid",
  "in_review",
  "pending_info",
  "approved",
  "declined",
  "escalated",
  "completed",
  "cancelled",
  "expired",
  "awaiting_script",
] as const

const CANONICAL_PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "refunded",
  "failed",
  "expired",
  "disputed",
  "partially_refunded",
  "refund_processing",
  "refund_failed",
] as const

const patientIntakeClientSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/client.tsx"),
  "utf8",
)

const patientStatusListenerSource = readFileSync(
  join(process.cwd(), "components/patient/intake-status-listener.tsx"),
  "utf8",
)

describe("intake status source of truth", () => {
  it("has display metadata for every canonical intake status", () => {
    for (const status of CANONICAL_INTAKE_STATUSES) {
      expect(INTAKE_STATUS[status], status).toBeDefined()
      expect(INTAKE_STATUS[status]?.label, status).toBeTruthy()
      expect(formatIntakeStatus(status), status).not.toBe("Unknown")
    }
  })

  it("has display metadata for every canonical payment status", () => {
    for (const status of CANONICAL_PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS[status], status).toBeDefined()
      expect(PAYMENT_STATUS[status]?.label, status).toBeTruthy()
    }
  })

  it("keeps active patient statuses visible in the live status tracker", () => {
    expect(patientIntakeClientSource).toContain("awaiting_script")
    expect(patientIntakeClientSource).toContain("escalated")
    expect(patientStatusListenerSource).toContain("awaiting_script")
    expect(patientStatusListenerSource).toContain("escalated")
  })
})
