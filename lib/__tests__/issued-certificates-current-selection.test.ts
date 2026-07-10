import { beforeEach, describe, expect, it, vi } from "vitest"

type CertificateRow = {
  id: string
  intake_id: string
  status: "valid" | "revoked" | "superseded" | "expired"
  patient_name: string
  patient_name_enc: string | null
  certificate_type: "work"
  verification_code: string
  created_at: string
  updated_at: string
}

const state = vi.hoisted(() => ({
  rows: [] as CertificateRow[],
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => {
      const equals = new Map<string, unknown>()
      const notEquals = new Map<string, unknown>()
      const builder = {
        select: () => builder,
        eq: (field: string, value: unknown) => {
          equals.set(field, value)
          return builder
        },
        neq: (field: string, value: unknown) => {
          notEquals.set(field, value)
          return builder
        },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          const matches = state.rows.filter((row) => {
            for (const [field, value] of equals) {
              if (row[field as keyof CertificateRow] !== value) return false
            }
            for (const [field, value] of notEquals) {
              if (row[field as keyof CertificateRow] === value) return false
            }
            return true
          })
          return { data: matches[0] ?? null, error: null }
        },
      }
      return builder
    },
  }),
}))

vi.mock("@/lib/security/phi-field-wrappers", () => ({
  prepareCertificatePatientNameWrite: vi.fn(),
  readCertificatePatientName: vi.fn(async (row: CertificateRow) => row.patient_name),
}))

import {
  findExistingCertificate,
  getCertificateForIntake,
  getCertificateWithPdfUrl,
  hasIssuedCertificateHistory,
} from "@/lib/data/issued-certificates"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

function certificate(status: CertificateRow["status"]): CertificateRow {
  return {
    id: `certificate-${status}`,
    intake_id: INTAKE_ID,
    status,
    patient_name: "Test Patient",
    patient_name_enc: null,
    certificate_type: "work",
    verification_code: "VERIFY123",
    created_at: "2026-07-10T00:00:00.000Z",
    updated_at: "2026-07-10T00:00:00.000Z",
  }
}

describe("current certificate selection", () => {
  beforeEach(() => {
    state.rows = []
  })

  it("returns a valid certificate for current and download-ready behavior", async () => {
    state.rows = [certificate("valid")]

    await expect(getCertificateForIntake(INTAKE_ID)).resolves.toMatchObject({
      id: "certificate-valid",
      status: "valid",
    })
    await expect(getCertificateWithPdfUrl(INTAKE_ID)).resolves.toMatchObject({
      id: "certificate-valid",
      pdf_url: "/api/patient/certificates/certificate-valid/download",
    })
  })

  it.each(["superseded", "expired", "revoked"] as const)(
    "does not treat a %s historical certificate as current, idempotent, or download-ready",
    async (status) => {
      state.rows = [certificate(status)]

      await expect(getCertificateForIntake(INTAKE_ID)).resolves.toBeNull()
      await expect(findExistingCertificate(INTAKE_ID)).resolves.toBeNull()
      await expect(getCertificateWithPdfUrl(INTAKE_ID)).resolves.toBeNull()
      await expect(hasIssuedCertificateHistory(INTAKE_ID)).resolves.toBe(true)
    },
  )
})
