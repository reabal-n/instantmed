import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { derivePatientPaymentRecoveryReason } from "@/lib/patient/payment-recovery"

const queriesSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/queries.ts"),
  "utf8",
)

const dashboardProjectionSource = queriesSource.slice(
  queriesSource.indexOf("export const getPatientDashboardData"),
  queriesSource.indexOf("// ============================================\n// STAFF COCKPIT", queriesSource.indexOf("export const getPatientDashboardData")),
)

const patientListProjectionSource = queriesSource.slice(
  queriesSource.indexOf("export function getPatientIntakes"),
  queriesSource.indexOf("/**\n * Fetch a single intake for a patient", queriesSource.indexOf("export function getPatientIntakes")),
)

const patientDetailProjectionSource = queriesSource.slice(
  queriesSource.indexOf("export async function getIntakeForPatient"),
  queriesSource.indexOf("// ============================================\n// DOCTOR/ADMIN QUERIES", queriesSource.indexOf("export async function getIntakeForPatient")),
)

describe("patient payment recovery projection", () => {
  it("projects only the exact missing-safety marker", () => {
    expect(derivePatientPaymentRecoveryReason("safety_missing_required_information"))
      .toBe("more_information_required")

    for (const value of [
      null,
      undefined,
      "",
      "checkout_session_failed",
      "safety_blocked_high_stakes",
      "safety_missing_required_information_extra",
      "prefix_safety_missing_required_information",
    ]) {
      expect(derivePatientPaymentRecoveryReason(value)).toBeNull()
    }
  })

  it("never returns the raw server marker", () => {
    expect(derivePatientPaymentRecoveryReason("safety_missing_required_information"))
      .not.toBe("safety_missing_required_information")
  })

  it("contains checkout_error inside server projections and exposes only the narrow reason", () => {
    for (const source of [
      dashboardProjectionSource,
      patientListProjectionSource,
      patientDetailProjectionSource,
    ]) {
      expect(source).toContain("checkout_error")
      expect(source).toContain("payment_recovery_reason")
      expect(source).toContain("derivePatientPaymentRecoveryReason")
    }

    expect(dashboardProjectionSource).not.toContain("...row")
    expect(patientListProjectionSource).toContain("checkout_error: _checkoutError")
    expect(patientDetailProjectionSource).toContain("checkout_error: _checkoutError")
  })
})
