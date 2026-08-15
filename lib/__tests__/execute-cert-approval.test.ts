import crypto from "crypto"
import { beforeEach, describe, expect, it, type Mock,vi } from "vitest"

// ---------------------------------------------------------------------------
// execute-cert-approval is the shared core of BOTH doctor-manual and AI
// auto-approval. It was coverage-excluded for months despite being the
// money/safety-critical certificate pipeline (intake fetch -> validate ->
// PDF -> storage -> atomic DB approval -> email -> notify). These tests
// characterise every guard branch so the exclusion can be removed.
//
// Everything below the function's I/O boundary is mocked: Supabase (the
// global setup mock has no `storage` and omits `createNotification`, so we
// override it here with a configurable client), the PDF renderer, storage,
// email, and the issued-certificates data layer. The pure collaborators
// (date-policy, format, constants, URL builders) run for real.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  state: {
    intake: null as Record<string, unknown> | null,
    intakeError: null as { message: string } | null,
    phProfile: null as Record<string, unknown> | null,
    uploadResults: [] as Array<{ error: unknown }>,
    uploadIndex: 0,
    removeResults: [] as Array<{ error: unknown }>,
    removeIndex: 0,
    removeCalls: [] as string[][],
    updateCalls: [] as Array<Record<string, unknown>>,
    rpcCalls: [] as Array<{ name: string; args: unknown }>,
  },
}))

// Configurable service-role client (overrides the generic global setup mock).
vi.mock("@/lib/supabase/service-role", () => {
  const makeFrom = (table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: h.state.phProfile, error: null }),
          }),
        }),
      }
    }
    // intakes (and any other table)
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: h.state.intake, error: h.state.intakeError }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        h.state.updateCalls.push(payload)
        return { eq: async () => ({ error: null }) }
      },
    }
  }
  const storage = {
    from: () => ({
      upload: async () => {
        const result = h.state.uploadResults[h.state.uploadIndex] ?? { error: null }
        h.state.uploadIndex += 1
        return result
      },
      remove: async (paths: string[]) => {
        h.state.removeCalls.push(paths)
        const result = h.state.removeResults[h.state.removeIndex] ?? { error: null }
        h.state.removeIndex += 1
        return result
      },
    }),
  }
  return {
    createServiceRoleClient: () => ({
      from: (table: string) => makeFrom(table),
      storage,
      rpc: async (name: string, args: unknown) => {
        h.state.rpcCalls.push({ name, args })
        return { error: null }
      },
    }),
  }
})

vi.mock("@/lib/pdf/template-renderer", () => ({
  renderTemplatePdf: vi.fn(),
}))
vi.mock("@/lib/pdf/cert-identifiers", () => ({
  generateCertificateNumber: vi.fn(),
  generateCertificateRef: vi.fn(),
  generateVerificationCode: vi.fn(),
}))
vi.mock("@/lib/data/issued-certificates", () => ({
  atomicApproveCertificate: vi.fn(),
  findExistingCertificate: vi.fn(),
  compareForEdits: vi.fn(() => []),
  logCertificateEdits: vi.fn(async () => ({ editCount: 0, errors: [] })),
  logCertificateEvent: vi.fn(async () => {}),
  updateEmailStatus: vi.fn(async () => {}),
}))
vi.mock("@/lib/data/doctor-identity", () => ({
  getDoctorIdentity: vi.fn(),
}))
vi.mock("@/lib/clinical/manual-cert-claim", () => ({
  claimIntakeForManualCertApproval: vi.fn(),
}))
vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}))
vi.mock("@/lib/medical-certificates/email-delivery-reconciliation", () => ({
  reconcileCertificateEmailDelivery: vi.fn(),
}))
vi.mock("@/lib/email/components/templates", () => ({
  MedCertPatientEmail: vi.fn(() => null),
  medCertPatientEmailSubject: vi.fn(() => "Your certificate is ready"),
}))
vi.mock("@/lib/notifications/service", () => ({
  createNotification: vi.fn(async () => {}),
}))
vi.mock("@/lib/notifications/edit-paid-request-telegram", () => ({
  editPaidRequestTelegramMessageToApproved: vi.fn(async () => {}),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: vi.fn(),
  trackIntakeFunnelStep: vi.fn(),
}))
vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: vi.fn(),
  revalidatePatient: vi.fn(),
}))
// Keep real price math except getAbsenceDays (controls the paid-tier branch).
vi.mock("@/lib/stripe/price-mapping", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/price-mapping")>()),
  getAbsenceDays: vi.fn(),
}))

import { executeCertApproval } from "@/lib/clinical/execute-cert-approval"
import { claimIntakeForManualCertApproval } from "@/lib/clinical/manual-cert-claim"
import { getDoctorIdentity } from "@/lib/data/doctor-identity"
import {
  atomicApproveCertificate,
  compareForEdits,
  findExistingCertificate,
  logCertificateEdits,
} from "@/lib/data/issued-certificates"
import { MedCertPatientEmail } from "@/lib/email/components/templates"
import { sendEmail } from "@/lib/email/send-email"
import { reconcileCertificateEmailDelivery } from "@/lib/medical-certificates/email-delivery-reconciliation"
import { editPaidRequestTelegramMessageToApproved } from "@/lib/notifications/edit-paid-request-telegram"
import { generateCertificateNumber, generateCertificateRef, generateVerificationCode } from "@/lib/pdf/cert-identifiers"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import type { CertReviewData } from "@/types/db"

const mock = (fn: unknown) => fn as Mock

/** Date offset from today as YYYY-MM-DD. Past offsets are always valid
 *  (the pipeline calls validateCertificateDateRange with maxBackdateDays:null). */
function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function reviewData(startOffset = -3, days = 1): CertReviewData {
  return {
    doctorName: "Dr Test",
    consultDate: isoDay(-3),
    startDate: isoDay(startOffset),
    endDate: isoDay(startOffset + days - 1),
    medicalReason: "Acute viral illness",
  }
}

const doctorProfile = {
  id: "doc-1",
  full_name: "Test Doctor",
  provider_number: "PRV12345",
  ahpra_number: "MED0001234567",
}

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

function baseIntake(overrides: Record<string, unknown> = {}) {
  return {
    id: INTAKE_ID,
    status: "paid",
    subtype: "work",
    service: { id: "svc-1", slug: "med-certs", name: "Medical Certificate", type: "med_certs" },
    patient: {
      id: "pat-1",
      full_name: "Jane Patient",
      email: "jane@example.com",
      date_of_birth: "1990-01-01",
      referral_code: null,
      auth_user_id: "auth-1",
    },
    answers: [{ answers: { duration: "1" } }],
    ...overrides,
  }
}

function run(input: Partial<Parameters<typeof executeCertApproval>[0]> = {}) {
  return executeCertApproval({
    intakeId: INTAKE_ID,
    reviewData: reviewData(),
    doctorProfile,
    ...input,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.intake = baseIntake()
  h.state.intakeError = null
  h.state.phProfile = { auth_user_id: "auth-1" }
  h.state.uploadResults = []
  h.state.uploadIndex = 0
  h.state.removeResults = []
  h.state.removeIndex = 0
  h.state.removeCalls = []
  h.state.updateCalls = []
  h.state.rpcCalls = []

  mock(renderTemplatePdf).mockResolvedValue({ success: true, buffer: Buffer.from("PDF-BYTES") })
  mock(getDoctorIdentity).mockResolvedValue({ nominals: "MBBS, FRACGP" })
  mock(claimIntakeForManualCertApproval).mockResolvedValue({ success: true })
  mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: false })
  mock(findExistingCertificate).mockResolvedValue(null)
  mock(sendEmail).mockResolvedValue({ success: true, messageId: "msg-1", outboxId: "ob-1" })
  mock(reconcileCertificateEmailDelivery).mockResolvedValue({ success: true, failedSteps: [] })
  mock(compareForEdits).mockReturnValue([])
  mock(logCertificateEdits).mockResolvedValue({ editCount: 0, errors: [] })
  mock(getAbsenceDays).mockReturnValue(1)
  mock(generateCertificateNumber).mockReturnValue("IM-TEST-CERTNO")
  mock(generateVerificationCode).mockReturnValue("VERIFY123")
  let refCounter = 0
  mock(generateCertificateRef).mockImplementation(() => `IM-WORK-REF-${++refCounter}`)
})

describe("executeCertApproval — guard branches", () => {
  it("returns an error when the intake is not found", async () => {
    h.state.intake = null
    h.state.intakeError = { message: "row not found" }

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Intake not found/i)
  })

  it("rejects an intake that is not a medical-certificate service", async () => {
    h.state.intake = baseIntake({ service: { id: "s", slug: "ed", name: "ED", type: "consult" } })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/only for medical certificate/i)
  })

  it("rejects an intake whose status is not reviewable", async () => {
    h.state.intake = baseIntake({ status: "declined" })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already declined/i)
  })

  it("auto-approval (skipClaim) only accepts paid or approved, never in_review", async () => {
    h.state.intake = baseIntake({ status: "in_review" })

    const result = await run({ skipClaim: true })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already in_review/i)
  })

  it("returns the existing certificate idempotently when already approved", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "existing-cert",
      certificate_number: "IM-OLD",
      patient_id: "pat-1",
    })

    const result = await run()

    expect(result).toMatchObject({ success: true, certificateId: "existing-cert", isExisting: true })
    // Idempotent short-circuit: never re-issues or re-emails.
    expect(atomicApproveCertificate).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("repairs winner-crash delivery from the persisted approved certificate", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "persisted-cert",
      certificate_number: "MC-2026-PERSISTED",
      certificate_type: "study",
      verification_code: "PERSISTED-CODE",
      storage_path: "certificates/persisted-cert.pdf",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      email_sent_at: null,
      template_config_snapshot: {
        certificate_issued_at_utc: "2026-01-01T00:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-01",
      },
    })

    const result = await run()

    expect(result).toMatchObject({
      success: true,
      certificateId: "persisted-cert",
      isExisting: true,
      emailSent: true,
      emailSentTo: "jane@example.com",
    })
    expect(renderTemplatePdf).not.toHaveBeenCalled()
    expect(atomicApproveCertificate).not.toHaveBeenCalled()
    expect(MedCertPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      verificationCode: "PERSISTED-CODE",
      certType: "study",
    }))
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "persisted-cert",
      idempotencyKey: expect.stringMatching(/^certificate-initial:persisted-cert:/),
      metadata: expect.objectContaining({
        certificate_storage_version: expect.any(String),
        cert_type: "study",
        delivery_repair: true,
      }),
    }))
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "persisted-cert",
      outcome: "sent",
      eventData: { delivery_repair: true },
    }))
  })

  it("accepts a concurrent repair only when the same durable outbox already owns delivery", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "persisted-cert",
      certificate_number: "MC-2026-PERSISTED",
      certificate_type: "work",
      verification_code: "PERSISTED-CODE",
      storage_path: "certificates/persisted-cert.pdf",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      email_sent_at: null,
      template_config_snapshot: {
        certificate_issued_at_utc: "2026-01-01T00:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-01",
      },
    })
    mock(sendEmail).mockResolvedValue({
      success: true,
      skipped: true,
      outboxId: "existing-outbox",
    })

    const result = await run()

    expect(result).toEqual({
      success: true,
      certificateId: "persisted-cert",
      isExisting: true,
    })
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "persisted-cert",
      idempotencyKey: expect.stringMatching(/^certificate-initial:persisted-cert:/),
    }))
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })

  it("does not accept a persisted failure alert as the winner-crash delivery owner", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "persisted-cert",
      certificate_number: "MC-2026-PERSISTED",
      certificate_type: "work",
      verification_code: "PERSISTED-CODE",
      storage_path: "certificates/persisted-cert.pdf",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      email_sent_at: null,
      template_config_snapshot: {
        certificate_issued_at_utc: "2026-01-01T00:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-01",
      },
    })
    mock(sendEmail).mockResolvedValue({ success: false, error: "outbox unavailable" })
    mock(reconcileCertificateEmailDelivery).mockResolvedValue({
      success: true,
      failedSteps: [],
    })

    const result = await run()

    expect(result).toEqual({
      success: false,
      error: "Certificate exists, but delivery could not be queued. Please retry.",
    })
    expect(renderTemplatePdf).not.toHaveBeenCalled()
    expect(atomicApproveCertificate).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "persisted-cert",
      outcome: "failed",
      failureReason: "outbox unavailable",
    }))
  })

  it("fails closed instead of repairing from inconsistent persisted issue-date evidence", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "persisted-cert",
      certificate_number: "MC-2026-PERSISTED",
      certificate_type: "work",
      verification_code: "PERSISTED-CODE",
      storage_path: "certificates/persisted-cert.pdf",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      email_sent_at: null,
      template_config_snapshot: {
        certificate_issued_at_utc: "2026-01-01T00:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-02",
      },
    })

    const result = await run()

    expect(result).toEqual({
      success: false,
      error: "Certificate delivery evidence is inconsistent. Contact support before retrying.",
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })

  it("leaves corrected-certificate delivery with the correction workflow", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue({
      id: "persisted-cert",
      certificate_number: "MC-2026-PERSISTED",
      certificate_type: "work",
      verification_code: "PERSISTED-CODE",
      storage_path: "certificates/corrections/persisted-cert/version-2.pdf",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      email_sent_at: null,
      template_config_snapshot: {
        certificate_issued_at_utc: "2026-01-01T00:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-01",
      },
    })

    const result = await run()

    expect(result).toEqual({
      success: true,
      certificateId: "persisted-cert",
      isExisting: true,
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })

  it("regenerates a certificate for an approved intake with no valid cert", async () => {
    h.state.intake = baseIntake({ status: "approved" })
    mock(findExistingCertificate).mockResolvedValue(null)

    const result = await run()

    expect(result.success).toBe(true)
    expect(atomicApproveCertificate).toHaveBeenCalled()
  })

  it("aborts when the manual review claim fails", async () => {
    mock(claimIntakeForManualCertApproval).mockResolvedValue({ success: false, error: "Already claimed by another doctor" })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Already claimed/i)
    expect(renderTemplatePdf).not.toHaveBeenCalled()
  })

  it("aborts when the patient has no email address", async () => {
    h.state.intake = baseIntake({
      patient: { id: "pat-1", full_name: "Jane", email: null, date_of_birth: null, referral_code: null, auth_user_id: "auth-1" },
    })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Patient email not found/i)
  })

  it("blocks an invalid certificate date range (end before start)", async () => {
    const result = await run({ reviewData: { ...reviewData(), startDate: isoDay(-1), endDate: isoDay(-3) } })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/end date must be on or after start date/i)
  })

  it("hard-blocks a certificate longer than the paid tier", async () => {
    mock(getAbsenceDays).mockReturnValue(1) // paid for 1 day
    const result = await run({ reviewData: reviewData(-3, 3) }) // doctor set 3 days

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/exceeds the paid tier/i)
    expect(atomicApproveCertificate).not.toHaveBeenCalled()
  })

  it("allows a certificate shorter than the paid tier (soft flag)", async () => {
    mock(getAbsenceDays).mockReturnValue(3) // paid for 3 days
    const result = await run({ reviewData: reviewData(-3, 1) }) // doctor set 1 day

    expect(result.success).toBe(true)
    expect(atomicApproveCertificate).toHaveBeenCalled()
  })

  it("aborts when doctor identity cannot be resolved", async () => {
    mock(getDoctorIdentity).mockResolvedValue(null)

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Doctor identity not found/i)
  })
})

describe("executeCertApproval — PDF + storage", () => {
  it("uses one Sydney civil issue date for identifiers, PDF fields, and persistence", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-15T15:02:00.000Z"))

    try {
      const result = await run({ skipClaim: true, aiApproved: true })

      expect(result.success).toBe(true)
      expect(generateCertificateNumber).toHaveBeenCalledWith("2026-08-16")
      expect(generateCertificateRef).toHaveBeenCalledWith("work", "2026-08-16")
      expect(renderTemplatePdf).toHaveBeenCalledWith(expect.objectContaining({
        consultationDate: "16 August 2026",
        issueDate: "16/08/2026",
      }))
      expect(atomicApproveCertificate).toHaveBeenCalledWith(expect.objectContaining({
        issue_date: "2026-08-16",
        template_config_snapshot: expect.objectContaining({
          certificate_issued_at_utc: "2026-08-15T15:02:00.000Z",
          certificate_issued_on_sydney: "2026-08-16",
        }),
      }))
    } finally {
      vi.useRealTimers()
    }
  })

  it("aborts when PDF generation fails", async () => {
    mock(renderTemplatePdf).mockResolvedValue({ success: false, error: "renderer exploded" })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/renderer exploded|Failed to generate/i)
  })

  it("regenerates the ref and retries on a storage collision", async () => {
    h.state.uploadResults = [
      { error: { statusCode: 409, message: "The resource already exists" } },
      { error: null },
    ]

    const result = await run()

    expect(result.success).toBe(true)
    // First ref collided, so a second ref was generated.
    const refCalls = (generateCertificateRef as Mock).mock.calls
    expect(refCalls.length).toBeGreaterThanOrEqual(2)
    expect(new Set(refCalls.map((call) => call[1])).size).toBe(1)
  })

  it("aborts on a non-collision storage error", async () => {
    h.state.uploadResults = [{ error: { statusCode: 500, message: "disk full" } }]

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Failed to store certificate/i)
  })

  it("gives up after exhausting collision retries", async () => {
    h.state.uploadResults = [
      { error: { statusCode: 409, message: "already exists" } },
      { error: { statusCode: 409, message: "already exists" } },
      { error: { statusCode: 409, message: "already exists" } },
    ]

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Failed to store certificate/i)
  })
})

describe("executeCertApproval — atomic approval + delivery", () => {
  it.each([
    ["study", "study"],
    ["uni", "study"],
    ["carer", "carer"],
    ["sick_leave", "work"],
  ] as const)("issues legacy answer purpose %s as %s even when the intake subtype is generic", async (storedPurpose, expectedType) => {
    h.state.intake = baseIntake({
      subtype: "med-cert",
      answers: [{ answers: { certType: storedPurpose, duration: "1" } }],
    })

    const result = await run({ skipClaim: true, aiApproved: true })

    expect(result.success).toBe(true)
    expect(atomicApproveCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: expectedType }),
    )
  })

  it("aborts and cleans up when the atomic approval fails", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: false, error: "transaction rolled back" })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/transaction rolled back|Failed to create certificate/i)
  })

  it("fails defensively when the atomic approval returns no certificate id", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: undefined })

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/missing certificate ID/i)
  })

  it("defers the patient email on a manual approval (undo window)", async () => {
    const result = await run({ skipClaim: false, aiApproved: false })

    expect(result.success).toBe(true)
    expect(result.emailScheduledFor).toBeTruthy()
    // Deferred sends must not claim delivery to the doctor toast yet.
    expect(result.emailSentTo).toBeUndefined()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ scheduledFor: expect.any(String) }))
    // Deferred path logs the queue event but does NOT mark the cert "sent".
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "sent" }),
    )
  })

  it("sends immediately and flags ai_approved on auto-approval", async () => {
    const result = await run({ skipClaim: true, aiApproved: true, aiApprovalReason: "low risk, met all rules" })

    expect(result.success).toBe(true)
    expect(result.emailScheduledFor).toBeUndefined()
    expect(result.emailSentTo).toBe("jane@example.com")
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "cert-1",
      idempotencyKey: expect.stringMatching(/^certificate-initial:cert-1:/),
    }))
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      intakeId: INTAKE_ID,
      certificateId: "cert-1",
      outcome: "sent",
      providerMessageId: "msg-1",
      outboxId: "ob-1",
      source: "initial_approval",
    }))
    expect(h.state.updateCalls.some((c) => c.ai_approved === true)).toBe(true)
  })

  it("waits for the Telegram status edit before reporting approval complete", async () => {
    let releaseEdit!: () => void
    const editPending = new Promise<void>((resolve) => {
      releaseEdit = resolve
    })
    mock(editPaidRequestTelegramMessageToApproved).mockReturnValueOnce(editPending)

    const resultPromise = run({ skipClaim: true, aiApproved: true })

    await vi.waitFor(() => {
      expect(editPaidRequestTelegramMessageToApproved).toHaveBeenCalledWith(INTAKE_ID)
    })

    let approvalSettled = false
    void resultPromise.then(() => {
      approvalSettled = true
    })
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(approvalSettled).toBe(false)

    releaseEdit()
    await expect(resultPromise).resolves.toMatchObject({ success: true })
  })

  it("still reports success when the email send fails (cert already issued)", async () => {
    mock(sendEmail).mockResolvedValue({ success: false, error: "mailbox unavailable" })

    const result = await run({ aiApproved: true, skipClaim: true })

    expect(result.success).toBe(true)
    expect(result.emailSent).toBe(false)
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      intakeId: INTAKE_ID,
      certificateId: "cert-1",
      outcome: "failed",
      failureReason: "mailbox unavailable",
      source: "initial_approval",
    }))
  })

  it("routes guest patients to the account-link URL, not the auth-walled portal", async () => {
    h.state.intake = baseIntake({
      patient: { id: "pat-1", full_name: "Guest User", email: "guest@example.com", date_of_birth: "1990-01-01", referral_code: null, auth_user_id: null },
    })
    h.state.phProfile = { auth_user_id: null }

    const result = await run({ aiApproved: true, skipClaim: true })

    expect(result.success).toBe(true)
    expect(MedCertPatientEmail).toHaveBeenCalledWith(expect.objectContaining({ isGuest: true }))
  })

  it("logs the certificate edits when the doctor changed the dates/reason", async () => {
    mock(compareForEdits).mockReturnValue([{ field: "endDate", from: "2026-01-01", to: "2026-01-02" }])
    mock(logCertificateEdits).mockResolvedValue({ editCount: 1, errors: [] })

    const result = await run()

    expect(result.success).toBe(true)
    expect(logCertificateEdits).toHaveBeenCalled()
  })

  it("discards the uncommitted candidate and returns persisted delivery state after an idempotent race", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: true })
    mock(findExistingCertificate).mockResolvedValue({
      id: "cert-1",
      email_sent_at: "2026-01-01T00:00:00Z",
      storage_path: "certificates/persisted.pdf",
      pdf_hash: "persisted-hash",
      patient_id: "pat-1",
    })

    const result = await run()

    expect(result).toMatchObject({
      success: true,
      certificateId: "cert-1",
      isExisting: true,
      emailSent: true,
    })
    expect(h.state.removeCalls).toEqual([["certificates/IM-WORK-REF-1.pdf"]])
    expect(sendEmail).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })

  it("does not deliver candidate credentials when the persisted idempotent certificate is unsent", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: true })
    mock(findExistingCertificate).mockResolvedValue({
      id: "cert-1",
      email_sent_at: null,
      storage_path: "certificates/persisted.pdf",
      pdf_hash: "persisted-hash",
      patient_id: "pat-1",
      created_at: "2026-01-01T00:00:00.000Z",
      issue_date: "2026-01-01",
      verification_code: "PERSISTED-CODE",
      certificate_type: "study",
      template_config_snapshot: {
        certificate_issued_at_utc: "2025-12-31T13:00:00.000Z",
        certificate_issued_on_sydney: "2026-01-01",
      },
    })

    const result = await run({ aiApproved: true, skipClaim: true })

    expect(result).toMatchObject({
      success: true,
      certificateId: "cert-1",
      isExisting: true,
      emailSent: true,
      emailSentTo: "jane@example.com",
    })
    expect(h.state.removeCalls).toEqual([["certificates/IM-WORK-REF-1.pdf"]])
    expect(h.state.updateCalls).toEqual([])
    expect(MedCertPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      verificationCode: "PERSISTED-CODE",
      certType: "study",
    }))
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "cert-1",
      idempotencyKey: expect.stringMatching(/^certificate-initial:cert-1:/),
      metadata: expect.objectContaining({
        certificate_storage_version: expect.any(String),
        cert_type: "study",
        delivery_repair: true,
      }),
    }))
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: "cert-1",
      outcome: "sent",
      eventData: { delivery_repair: true },
    }))
  })

  it("keeps an exact persisted artifact when an idempotent repair converges on the same bytes", async () => {
    const candidateHash = crypto.createHash("sha256").update(Buffer.from("PDF-BYTES")).digest("hex")
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: true })
    mock(findExistingCertificate).mockResolvedValue({
      id: "cert-1",
      email_sent_at: "2026-01-01T00:00:01.000Z",
      storage_path: "certificates/IM-WORK-REF-1.pdf",
      pdf_hash: candidateHash,
      patient_id: "pat-1",
    })

    const result = await run()

    expect(result).toMatchObject({ success: true, certificateId: "cert-1", isExisting: true })
    expect(h.state.removeCalls).toEqual([])
    expect(sendEmail).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })

  it("fails closed when an idempotent race candidate cannot be removed", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: true })
    mock(findExistingCertificate).mockResolvedValue({
      id: "cert-1",
      email_sent_at: null,
      storage_path: "certificates/persisted.pdf",
      pdf_hash: "persisted-hash",
    })
    h.state.removeResults = [{ error: { message: "storage unavailable" } }]

    const result = await run()

    expect(result).toEqual({
      success: false,
      error: "Certificate already exists, but duplicate PDF cleanup failed. Contact support before retrying.",
    })
    expect(h.state.removeCalls).toEqual([["certificates/IM-WORK-REF-1.pdf"]])
    expect(MedCertPatientEmail).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(reconcileCertificateEmailDelivery).not.toHaveBeenCalled()
  })
})
