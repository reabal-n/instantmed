import { describe, expect, it } from "vitest"

import {
  buildAdminLedgerSearchOr,
  getAdminLedgerServiceCategory,
  getAdminLedgerStatus,
  getAdminLedgerWorkLaneStatuses,
  normalizeAdminLedgerQuickFilters,
  sanitizeAdminLedgerSearchTerm,
} from "@/lib/dashboard/admin-ledger-filters"

describe("admin ledger filters", () => {
  it("normalizes only supported quick filters and preserves the priority alias", () => {
    expect(normalizeAdminLedgerQuickFilters([
      "express",
      "failed_payment",
      "mine",
      "stale",
      "failed_payment",
    ])).toEqual(["priority", "failed_payment"])
  })

  it("maps calm work lanes and service filters to persisted values", () => {
    expect(getAdminLedgerWorkLaneStatuses("clinical")).toContain("awaiting_script")
    expect(getAdminLedgerWorkLaneStatuses("recovery")).toEqual([
      "pending_payment",
      "checkout_failed",
    ])
    expect(getAdminLedgerWorkLaneStatuses("done")).toContain("completed")
    expect(getAdminLedgerServiceCategory("med_certs")).toBe("medical_certificate")
    expect(getAdminLedgerServiceCategory("repeat_rx")).toBe("prescription")
    expect(getAdminLedgerStatus("all")).toBeNull()
    expect(getAdminLedgerStatus("awaiting_script")).toBe("awaiting_script")
  })

  it("sanitizes PostgREST punctuation while retaining useful patient search text", () => {
    expect(sanitizeAdminLedgerSearchTerm('  José (test), +61 400\\"  ')).toBe(
      "José test +61 400",
    )
    expect(sanitizeAdminLedgerSearchTerm("a".repeat(120))).toHaveLength(96)
  })

  it("builds reference, exact UUID, and resolved-patient clauses without fallback identities", () => {
    const uuid = "11111111-1111-4111-8111-111111111111"
    expect(buildAdminLedgerSearchOr(uuid, ["patient-a", "patient-b"])).toBe(
      `reference_number.ilike.*${uuid}*,id.eq.${uuid},patient_id.in.(patient-a,patient-b)`,
    )
    expect(buildAdminLedgerSearchOr("IM-20260729")).toBe(
      "reference_number.ilike.*IM-20260729*",
    )
  })
})
