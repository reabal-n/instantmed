import { describe, expect, it } from "vitest"

import type { StuckIntake } from "@/lib/data/types/intake-ops"
import { buildStuckIntakeWarningPayload } from "@/lib/monitoring/stuck-intake-telemetry"

describe("stuck intake telemetry", () => {
  it("does not send patient identifiers or contact details to external telemetry", () => {
    const payload = buildStuckIntakeWarningPayload({
      id: "intake-sensitive-id",
      reference_number: "IM-SENSITIVE-REF",
      status: "pending_info",
      payment_status: "paid",
      category: "medical_certificate",
      subtype: "work",
      service_name: "Medical certificate",
      service_type: "certificate",
      is_priority: true,
      patient_email: "patient@example.test",
      patient_name: "Patient Name",
      created_at: "2026-05-01T00:00:00.000Z",
      paid_at: "2026-05-01T00:00:00.000Z",
      reviewed_at: "2026-05-01T00:10:00.000Z",
      approved_at: null,
      stuck_reason: "review_timeout",
      stuck_age_minutes: 72,
    } satisfies StuckIntake)

    const serialized = JSON.stringify(payload)

    expect(serialized).not.toContain("intake-sensitive-id")
    expect(serialized).not.toContain("IM-SENSITIVE-REF")
    expect(serialized).not.toContain("patient@example.test")
    expect(serialized).not.toContain("Patient Name")
    expect(payload.tags).toMatchObject({
      stuck_reason: "review_timeout",
      service_type: "certificate",
      consult_subtype: "work",
      intake_status: "pending_info",
    })
    expect(payload.extra).toEqual({
      stuck_age_minutes: 72,
      is_priority: true,
    })
  })
})
