import { describe, expect, it } from "vitest"

import {
  ADMIN_LEDGER_SELECT,
  projectAdminLedgerPatient,
} from "@/lib/data/intakes/admin-ledger-projection"

describe("admin ledger projection", () => {
  it("fetches only fields used by the ledger and renewal badge", () => {
    const projection = ADMIN_LEDGER_SELECT.replace(/\s+/g, " ")
    const requiredFields = [
      "patient_id",
      "risk_flags",
      "payment_status",
      "refund_status",
      "reference_number",
      "reviewed_by",
      "answers_encrypted",
      "phone_encrypted",
      "heard_about_us",
    ]
    const forbiddenFields = [
      "subtype",
      "sla_deadline",
      "paid_at",
      "approved_at",
      "declined_at",
      "reviewed_at",
      "date_of_birth",
      "date_of_birth_encrypted",
      "sex",
      "medicare_number",
      "medicare_number_encrypted",
      "medicare_irn",
      "medicare_expiry",
      "ihi_number",
      "ihi_number_encrypted",
      "address_line1",
      "postcode",
      "slug",
    ]

    for (const field of requiredFields) {
      expect(projection).toMatch(new RegExp(`\\b${field}\\b`))
    }
    for (const field of forbiddenFields) {
      expect(projection).not.toMatch(new RegExp(`\\b${field}\\b`))
    }
    expect(projection).not.toMatch(/(?:^|,)\s*service_id\s*,/)
  })

  it("returns only searchable patient metadata to the client", () => {
    const patient = projectAdminLedgerPatient({
      id: "patient-id",
      full_name: "Example Patient",
      email: "patient@example.test",
      phone: "0400000000",
      suburb: "Sydney",
      state: "NSW",
      date_of_birth: "1990-01-01",
      medicare_number: "hidden",
      ihi_number: "hidden",
      address_line1: "hidden",
      postcode: "2000",
    })

    expect(patient).toEqual({
      id: "patient-id",
      full_name: "Example Patient",
      email: "patient@example.test",
      phone: "0400000000",
      suburb: "Sydney",
      state: "NSW",
    })
  })
})
