import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

let loggerModule: typeof import("@/lib/observability/logger")

function captureInfo(message: string, context?: Record<string, unknown>): string {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
  loggerModule.logger.info(message, context)
  expect(infoSpy).toHaveBeenCalledOnce()
  return String(infoSpy.mock.calls[0]?.[0])
}

function captureWarning(message: string, context: Record<string, unknown>, error: Error): string {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  loggerModule.logger.warn(message, context, error)
  expect(warnSpy).toHaveBeenCalledOnce()
  return String(warnSpy.mock.calls[0]?.[0])
}

describe("logger PHI sanitization", () => {
  beforeAll(async () => {
    loggerModule = await vi.importActual<typeof import("@/lib/observability/logger")>(
      "@/lib/observability/logger",
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it("keeps sanitizers and the retired no-op logger out of the public API", () => {
    expect(Object.keys(loggerModule)).not.toContain("sanitizeLogContext")
    expect(Object.keys(loggerModule)).not.toContain("sanitizeLogMessage")
    expect(Object.keys(loggerModule)).not.toContain("silentLogger")
  })

  it("redacts request identifiers and clinical email subjects from structured logs", () => {
    const line = captureInfo("Certificate delivery status", {
      certificateId: "47e24318-089e-4658-885f-4b9049b69a35",
      certificateRef: "IM-WORK-20260430-98104640",
      verificationCode: "MC-ABC123-XYZ",
      intakeId: "e2e00000-0000-0000-0000-000000000010",
      status: "paid",
      subject: "Patient, your medical certificate is ready",
      userId: "e2e00000-0000-0000-0000-000000000002",
    })

    expect(line).toContain('"status":"paid"')
    expect(line).toContain("[REDACTED]")
    expect(line).not.toContain("47e24318")
    expect(line).not.toContain("IM-WORK")
    expect(line).not.toContain("MC-ABC123")
    expect(line).not.toContain("medical certificate is ready")
  })

  it("scrubs PHI-looking string values even when the key is generic", () => {
    const line = captureInfo("Navigation failed", {
      detail: "/doctor/intakes/47e24318-089e-4658-885f-4b9049b69a35",
    })

    expect(line).toContain("/doctor/intakes/[ID_REDACTED]")
    expect(line).not.toContain("47e24318")
  })

  it("scrubs PHI and identifiers interpolated directly into log messages", () => {
    const line = captureInfo(
      "[document-download] User 47e24318-089e-4658-885f-4b9049b69a35 failed for patient@example.test"
    )

    expect(line).toContain("[ID_REDACTED]")
    expect(line).toContain("[EMAIL_REDACTED]")
    expect(line).not.toContain("47e24318")
    expect(line).not.toContain("patient@example.test")
  })

  it("redacts queue search fields and sanitizes attached Error payloads", () => {
    const line = captureWarning(
      "Queue search failed",
      { q: "Patient Smith", searchTerm: "Patient Smith", errorCode: "PGRST100" },
      new Error("failed to parse logic tree (full_name.ilike.*Patient Smith*) for patient@example.test"),
    )

    expect(line).toContain("PGRST100")
    expect(line).not.toContain("Patient Smith")
    expect(line).not.toContain("patient@example.test")
    expect(line).toContain("[EMAIL_REDACTED]")
  })
})
