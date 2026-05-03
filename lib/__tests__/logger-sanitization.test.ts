import { beforeAll, describe, expect, it, vi } from "vitest"

let sanitizeLogContext: typeof import("@/lib/observability/logger").sanitizeLogContext
let sanitizeLogMessage: typeof import("@/lib/observability/logger").sanitizeLogMessage

describe("logger PHI sanitization", () => {
  beforeAll(async () => {
    const loggerModule = await vi.importActual<typeof import("@/lib/observability/logger")>(
      "@/lib/observability/logger",
    )
    sanitizeLogContext = loggerModule.sanitizeLogContext
    sanitizeLogMessage = loggerModule.sanitizeLogMessage
  })

  it("redacts request identifiers and clinical email subjects from structured logs", () => {
    const sanitized = sanitizeLogContext({
      certificateId: "47e24318-089e-4658-885f-4b9049b69a35",
      certificateRef: "IM-WORK-20260430-98104640",
      intakeId: "e2e00000-0000-0000-0000-000000000010",
      status: "paid",
      subject: "Patient, your medical certificate is ready",
      userId: "e2e00000-0000-0000-0000-000000000002",
    })

    expect(sanitized).toMatchObject({
      certificateId: "[REDACTED]",
      certificateRef: "[REDACTED]",
      intakeId: "[REDACTED]",
      status: "paid",
      subject: "[REDACTED]",
      userId: "[REDACTED]",
    })
    const line = JSON.stringify(sanitized)
    expect(line).not.toContain("47e24318")
    expect(line).not.toContain("IM-WORK")
    expect(line).not.toContain("medical certificate is ready")
  })

  it("scrubs PHI-looking string values even when the key is generic", () => {
    const sanitized = sanitizeLogContext({
      detail: "/doctor/intakes/47e24318-089e-4658-885f-4b9049b69a35",
    })

    const line = JSON.stringify(sanitized)

    expect(line).toContain("/doctor/intakes/[ID_REDACTED]")
    expect(line).not.toContain("47e24318")
  })

  it("scrubs PHI and identifiers interpolated directly into log messages", () => {
    const sanitized = sanitizeLogMessage(
      "[document-download] User 47e24318-089e-4658-885f-4b9049b69a35 failed for patient@example.test"
    )

    expect(sanitized).toContain("[ID_REDACTED]")
    expect(sanitized).toContain("[EMAIL_REDACTED]")
    expect(sanitized).not.toContain("47e24318")
    expect(sanitized).not.toContain("patient@example.test")
  })
})
