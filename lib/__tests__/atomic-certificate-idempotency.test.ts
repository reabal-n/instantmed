import { beforeEach, describe, expect, it, vi } from "vitest"

type CertificateRow = {
  id: string
  idempotency_key: string
  intake_id: string
  patient_name: string
  patient_name_enc: string | null
  status: "valid" | "revoked" | "superseded" | "expired"
}

type AtomicRpcResult = {
  certificate_id: string
  intake_document_id: string | null
  success: boolean
  error_message: string | null
  is_duplicate: boolean
}

const state = vi.hoisted(() => ({
  certificatesByKey: {} as Record<string, CertificateRow>,
  certificatesById: {} as Record<string, CertificateRow>,
  rpcCalls: [] as Array<Record<string, unknown>>,
  rpcResult: {
    certificate_id: "new-valid-certificate",
    intake_document_id: "new-intake-document",
    success: true,
    error_message: null as string | null,
    is_duplicate: false,
  } as AtomicRpcResult,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "intakes") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "intake-1",
                  status: "in_review",
                  payment_status: "paid",
                  claimed_by: "doctor-1",
                },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === "issued_certificates") {
        return {
          select: () => {
            let filterField = ""
            let filterValue = ""
            const query = {
              eq: (field: string, value: string) => {
                filterField = field
                filterValue = value
                return query
              },
              maybeSingle: async () => ({
                data: filterField === "idempotency_key"
                  ? state.certificatesByKey[filterValue] ?? null
                  : null,
                error: null,
              }),
              single: async () => ({
                data: filterField === "id" ? state.certificatesById[filterValue] ?? null : null,
                error: null,
              }),
            }
            return query
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
    rpc: vi.fn(async (_name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push(args)
      return { data: [state.rpcResult], error: null }
    }),
  }),
}))

vi.mock("@/lib/security/phi-field-wrappers", () => ({
  prepareCertificatePatientNameWrite: vi.fn(async (patientName: string) => ({
    patient_name: patientName,
    patient_name_enc: { ciphertext: "encrypted" },
  })),
  readCertificatePatientName: vi.fn(async (row: CertificateRow) => row.patient_name),
}))

import {
  type AtomicApprovalInput,
  atomicApproveCertificate,
  generateIdempotencyKey,
} from "@/lib/data/issued-certificates"

const atomicInput: AtomicApprovalInput = {
  intake_id: "intake-1",
  certificate_number: "IM-NEW-001",
  verification_code: "VERIFYNEW",
  certificate_type: "work",
  issue_date: "2026-07-10",
  start_date: "2026-07-10",
  end_date: "2026-07-10",
  patient_id: "patient-1",
  patient_name: "Test Patient",
  patient_dob: "1990-01-01",
  doctor_id: "doctor-1",
  doctor_name: "Dr Test",
  doctor_nominals: "MBBS",
  doctor_provider_number: "1234567A",
  doctor_ahpra_number: "MED0001234567",
  template_config_snapshot: {},
  clinic_identity_snapshot: {},
  storage_path: "certificates/IM-NEW-001.pdf",
  file_size_bytes: 1234,
  filename: "Medical_Certificate_IM-NEW-001.pdf",
  pdf_hash: "new-pdf-hash",
  certificate_ref: "IM-WORK-20260710-00001",
}

describe("atomic certificate approval idempotency", () => {
  beforeEach(() => {
    state.certificatesByKey = {}
    state.certificatesById = {}
    state.rpcCalls = []
    state.rpcResult = {
      certificate_id: "new-valid-certificate",
      intake_document_id: "new-intake-document",
      success: true,
      error_message: null,
      is_duplicate: false,
    }
  })

  it("keeps the canonical intake/doctor/day key for a first issuance", async () => {
    const baseKey = generateIdempotencyKey(
      atomicInput.intake_id,
      atomicInput.doctor_id,
      atomicInput.issue_date,
    )

    await atomicApproveCertificate(atomicInput)

    expect(state.rpcCalls[0]?.p_idempotency_key).toBe(baseKey)
  })

  it.each(["revoked", "superseded", "expired"] as const)(
    "rotates past a %s same-day idempotency row before asking the RPC to issue its replacement",
    async (status) => {
      const baseKey = generateIdempotencyKey(
        atomicInput.intake_id,
        atomicInput.doctor_id,
        atomicInput.issue_date,
      )
      const invalidCertificate: CertificateRow = {
        id: `${status}-certificate`,
        idempotency_key: baseKey,
        intake_id: atomicInput.intake_id,
        patient_name: atomicInput.patient_name,
        patient_name_enc: null,
        status,
      }
      state.certificatesByKey[baseKey] = invalidCertificate
      state.certificatesById[invalidCertificate.id] = invalidCertificate

      const result = await atomicApproveCertificate(atomicInput)

      expect(result).toMatchObject({
        success: true,
        certificateId: "new-valid-certificate",
        isExisting: false,
      })
      expect(state.rpcCalls).toHaveLength(1)
      const replacementKey = state.rpcCalls[0]?.p_idempotency_key
      expect(replacementKey).not.toBe(baseKey)

      state.rpcCalls = []
      await atomicApproveCertificate(atomicInput)

      expect(state.rpcCalls[0]?.p_idempotency_key).toBe(replacementKey)
    },
  )

  it("fails closed if the RPC reports an idempotent duplicate that is no longer valid", async () => {
    const revokedCertificate: CertificateRow = {
      id: "revoked-duplicate",
      idempotency_key: "legacy-duplicate-key",
      intake_id: atomicInput.intake_id,
      patient_name: atomicInput.patient_name,
      patient_name_enc: null,
      status: "revoked",
    }
    state.certificatesById[revokedCertificate.id] = revokedCertificate
    state.rpcResult = {
      certificate_id: revokedCertificate.id,
      intake_document_id: null,
      success: true,
      error_message: null,
      is_duplicate: true,
    }

    const result = await atomicApproveCertificate(atomicInput)

    expect(result).toEqual({
      success: false,
      error: "Existing idempotent certificate is no longer valid",
    })
  })
})
