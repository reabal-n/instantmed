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
      const orders: Array<{ field: keyof CertificateRow; ascending: boolean }> = []
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
        order: (field: keyof CertificateRow, options?: { ascending?: boolean }) => {
          orders.push({ field, ascending: options?.ascending ?? true })
          return builder
        },
        limit: () => builder,
        maybeSingle: async () => {
          const matches = state.rows
            .filter((row) => {
              for (const [field, value] of equals) {
                if (row[field as keyof CertificateRow] !== value) return false
              }
              for (const [field, value] of notEquals) {
                if (row[field as keyof CertificateRow] === value) return false
              }
              return true
            })
            .sort((left, right) => {
              for (const { field, ascending } of orders) {
                const comparison = String(left[field]).localeCompare(String(right[field]))
                if (comparison !== 0) return ascending ? comparison : -comparison
              }
              return 0
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

  it("breaks equal creation-time ties by descending certificate id", async () => {
    const lowerId = {
      ...certificate("valid"),
      id: "00000000-0000-4000-8000-000000000001",
    }
    const higherId = {
      ...certificate("valid"),
      id: "00000000-0000-4000-8000-000000000002",
    }
    state.rows = [lowerId, higherId]

    await expect(getCertificateForIntake(INTAKE_ID)).resolves.toMatchObject({
      id: higherId.id,
    })
    await expect(findExistingCertificate(INTAKE_ID)).resolves.toMatchObject({
      id: higherId.id,
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
