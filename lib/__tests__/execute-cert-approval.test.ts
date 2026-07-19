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
      remove: async () => ({ error: null }),
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

function baseIntake(overrides: Record<string, unknown> = {}) {
  return {
    id: "intake-1",
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
    intakeId: "intake-1",
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
    mock(findExistingCertificate).mockResolvedValue({ id: "existing-cert", certificate_number: "IM-OLD" })

    const result = await run()

    expect(result).toMatchObject({ success: true, certificateId: "existing-cert", isExisting: true })
    // Idempotent short-circuit: never re-issues or re-emails.
    expect(atomicApproveCertificate).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
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
    expect((generateCertificateRef as Mock).mock.calls.length).toBeGreaterThanOrEqual(2)
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
    expect(reconcileCertificateEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      intakeId: "intake-1",
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
      expect(editPaidRequestTelegramMessageToApproved).toHaveBeenCalledWith("intake-1")
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
      intakeId: "intake-1",
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

  it("short-circuits an idempotent re-approval whose email already sent", async () => {
    mock(atomicApproveCertificate).mockResolvedValue({ success: true, certificateId: "cert-1", isExisting: true })
    mock(findExistingCertificate).mockResolvedValue({ id: "cert-1", email_sent_at: "2026-01-01T00:00:00Z" })

    const result = await run()

    expect(result).toMatchObject({ success: true, certificateId: "cert-1", isExisting: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
