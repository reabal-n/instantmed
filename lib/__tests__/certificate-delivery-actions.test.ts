import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getApiAuth: vi.fn(),
  requireRole: vi.fn(),
  requireRoleOrNull: vi.fn(),
  doctorHasCapability: vi.fn(),
  checkResendRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getDoctorIdentity: vi.fn(),
  getCertificateForIntake: vi.fn(),
  getCertificateCorrectionCount: vi.fn(),
  commitCertificateCorrection: vi.fn(),
  recordCertificateEmailRetry: vi.fn(),
  reserveCertificateResend: vi.fn(),
  finalizeCertificateResend: vi.fn(),
  reconcileCertificateResendAttempts: vi.fn(),
  incrementEmailRetry: vi.fn(),
  logCertificateEvent: vi.fn(),
  updateEmailStatus: vi.fn(),
  sendEmail: vi.fn(),
  medCertPatientEmail: vi.fn(),
  renderTemplatePdf: vi.fn(),
  prepareCertificatePatientNameWrite: vi.fn(),
  reconcileCertificateEmailDelivery: vi.fn(),
  getAbsenceDays: vi.fn(),
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
  issuedCertificateUpdate: vi.fn(),
  sentryCaptureMessage: vi.fn(),
  sentryCaptureException: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.sentryCaptureMessage,
  captureException: mocks.sentryCaptureException,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
  requireRole: mocks.requireRole,
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  doctorHasCapability: mocks.doctorHasCapability,
}))

vi.mock("@/lib/rate-limit/resend-cert", () => ({
  checkResendRateLimit: mocks.checkResendRateLimit,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  commitCertificateCorrection: mocks.commitCertificateCorrection,
  finalizeCertificateResend: mocks.finalizeCertificateResend,
  getCertificateCorrectionCount: mocks.getCertificateCorrectionCount,
  getCertificateForIntake: mocks.getCertificateForIntake,
  incrementEmailRetry: mocks.incrementEmailRetry,
  logCertificateEvent: mocks.logCertificateEvent,
  recordCertificateEmailRetry: mocks.recordCertificateEmailRetry,
  reconcileCertificateResendAttempts: mocks.reconcileCertificateResendAttempts,
  reserveCertificateResend: mocks.reserveCertificateResend,
  updateEmailStatus: mocks.updateEmailStatus,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/email/components/templates", () => ({
  MedCertPatientEmail: mocks.medCertPatientEmail,
  medCertPatientEmailSubject: vi.fn(() => "Your certificate is ready"),
}))

vi.mock("@/lib/data/doctor-identity", () => ({
  getDoctorIdentity: mocks.getDoctorIdentity,
}))

vi.mock("@/lib/pdf/template-renderer", () => ({
  renderTemplatePdf: mocks.renderTemplatePdf,
}))

vi.mock("@/lib/security/phi-field-wrappers", () => ({
  prepareCertificatePatientNameWrite: mocks.prepareCertificatePatientNameWrite,
}))

vi.mock("@/lib/medical-certificates/email-delivery-reconciliation", () => ({
  reconcileCertificateEmailDelivery: mocks.reconcileCertificateEmailDelivery,
}))

vi.mock("@/lib/stripe/price-mapping", () => ({
  getAbsenceDays: mocks.getAbsenceDays,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: mocks.revalidatePatient,
  revalidateStaff: mocks.revalidateStaff,
}))

import { reissueCertificateAction } from "@/app/actions/reissue-cert"
import { resendCertificate, resendCertificateAsStaff } from "@/app/actions/resend-certificate"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const DOCTOR_ID = "44444444-4444-4444-8444-444444444444"

function createResendSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: INTAKE_ID,
              patient_id: PATIENT_ID,
              status: "approved",
              patient: {
                id: PATIENT_ID,
                full_name: "Test Patient",
                email: "patient@example.test",
                auth_user_id: "auth-patient-1",
              },
            },
            error: null,
          })),
        })),
      })),
    })),
  }
}

function createReissueSupabase(authUserId: string | null = null) {
  const notificationPatient = {
    id: PATIENT_ID,
    full_name: "Test Patient",
    email: "patient@example.test",
    auth_user_id: authUserId,
  }

  return {
    storage: {
      from: vi.fn(() => ({
        upload: mocks.storageUpload,
        remove: mocks.storageRemove,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn((columns: string) => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => columns === "patient_id"
                ? { data: { patient_id: PATIENT_ID }, error: null }
                : {
                    data: {
                      id: INTAKE_ID,
                      patient_id: PATIENT_ID,
                      patient: notificationPatient,
                    },
                    error: null,
                  }),
            })),
          })),
        }
      }

      if (table === "intake_answers") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { answers: { duration_days: 1 } }, error: null })),
            })),
          })),
        }
      }

      if (table === "issued_certificates") {
        return {
          update: mocks.issuedCertificateUpdate.mockImplementation(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

describe("patient certificate resend delivery reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuth.mockResolvedValue({ profile: { id: PATIENT_ID, role: "patient" } })
    mocks.checkResendRateLimit.mockResolvedValue({ allowed: true })
    mocks.createServiceRoleClient.mockReturnValue(createResendSupabase())
    mocks.getCertificateForIntake.mockResolvedValue({
      id: CERTIFICATE_ID,
      certificate_type: "work",
      storage_path: "certificates/current.pdf",
      verification_code: "VERIFY123",
    })
    mocks.incrementEmailRetry.mockResolvedValue({ success: true })
    mocks.logCertificateEvent.mockResolvedValue({ success: true })
    mocks.updateEmailStatus.mockResolvedValue({ success: true })
    mocks.reconcileCertificateEmailDelivery.mockResolvedValue({ success: true, failedSteps: [] })
    mocks.reserveCertificateResend.mockResolvedValue({ success: true, attemptStatus: "reserved" })
    mocks.finalizeCertificateResend.mockResolvedValue({ success: true, isDuplicate: false })
    mocks.reconcileCertificateResendAttempts.mockResolvedValue({ success: true, reconciledCount: 0 })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email-message-1" })
  })

  it("clears failed delivery state, records the patient retry, and refreshes the patient surface after a successful resend", async () => {
    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: true })
    expect(mocks.reserveCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: CERTIFICATE_ID,
      actorId: PATIENT_ID,
      actorRole: "patient",
      countTowardStaffLimit: false,
    }))
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: true,
      providerMessageId: "email-message-1",
    }))
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
  })

  it("records failed delivery state and an attributable audit event when the resend provider fails", async () => {
    mocks.sendEmail.mockResolvedValueOnce({ success: false, error: "provider unavailable" })

    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: false, error: "Failed to send email. Please try again." })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
      failureReason: "provider unavailable",
    }))
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
  })

  it("keeps an honest sent result while retrying and alerting on every failed reconciliation step", async () => {
    mocks.finalizeCertificateResend
      .mockResolvedValueOnce({ success: false, error: "commit response lost" })
      .mockResolvedValueOnce({ success: false, error: "finalize retry failed" })

    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: true })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledTimes(2)
    expect(mocks.sentryCaptureMessage).toHaveBeenCalledWith(
      "Patient certificate resend reconciliation failed",
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({ subsystem: "certificate-resend-reconciliation" }),
        extra: expect.objectContaining({
          failedSteps: ["resend_finalization"],
        }),
      }),
    )
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      ops: true,
      emails: true,
    })
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
  })

  it("leaves an outbox-backed provider failure reserved for durable dispatcher retries", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "provider unavailable",
      outboxId: "outbox-1",
      retryable: true,
    })

    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: true, queued: true })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
  })

  it("terminalizes an outbox-backed non-retryable provider rejection", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "invalid request",
      outboxId: "outbox-1",
      retryable: false,
    })

    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: false, error: "Failed to send email. Please contact support." })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
      emailOutboxId: "outbox-1",
      failureReason: "invalid request",
    }))
  })

  it("coalesces another patient click while the same certificate resend is queued", async () => {
    mocks.reserveCertificateResend.mockResolvedValue({
      success: false,
      error: "A certificate resend is already queued for this actor",
    })

    const result = await resendCertificate(INTAKE_ID)

    expect(result).toEqual({ success: true, queued: true })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
})

describe("staff certificate resend idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRole.mockResolvedValue({
      profile: { id: DOCTOR_ID, role: "doctor", full_name: "Doctor Test" },
    })
    mocks.createServiceRoleClient.mockReturnValue(createResendSupabase())
    mocks.getCertificateForIntake.mockResolvedValue({
      id: CERTIFICATE_ID,
      certificate_type: "work",
      verification_code: "VERIFY123",
      resend_count: 0,
      storage_path: "certificates/current.pdf",
      email_retry_count: 0,
    })
    mocks.sendEmail.mockResolvedValue({
      success: true,
      messageId: "provider-message-1",
      outboxId: "outbox-1",
    })
    mocks.reserveCertificateResend.mockResolvedValue({ success: true, attemptStatus: "reserved" })
    mocks.finalizeCertificateResend.mockResolvedValue({ success: true, isDuplicate: false })
    mocks.reconcileCertificateResendAttempts.mockResolvedValue({ success: true, reconciledCount: 0 })
  })

  it("retries an ambiguous bookkeeping result with the same durable idempotency key", async () => {
    mocks.finalizeCertificateResend
      .mockResolvedValueOnce({ success: false, error: "connection reset" })
      .mockResolvedValueOnce({ success: true, isDuplicate: true })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({ success: true })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.reserveCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: CERTIFICATE_ID,
      actorId: DOCTOR_ID,
      actorRole: "doctor",
      resendReason: "manual_admin_resend",
      countTowardStaffLimit: true,
    }))
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledTimes(2)
    expect(mocks.finalizeCertificateResend.mock.calls[1][0]).toEqual(
      mocks.finalizeCertificateResend.mock.calls[0][0],
    )
    const reservedAttemptId = mocks.reserveCertificateResend.mock.calls[0][0].attemptId
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: `certificate-resend:${reservedAttemptId}`,
    }))
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: reservedAttemptId,
      deliverySucceeded: true,
    }))
  })

  it("alerts operations without claiming the already-sent provider email failed", async () => {
    mocks.finalizeCertificateResend.mockResolvedValue({
      success: false,
      error: "database unavailable",
    })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({ success: true })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledTimes(2)
    expect(mocks.sentryCaptureMessage).toHaveBeenCalledWith(
      "Staff certificate resend reconciliation failed",
      expect.objectContaining({ level: "error" }),
    )
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      ops: true,
      emails: true,
    })
  })

  it("leaves an outbox-backed staff failure reserved for dispatcher recovery", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "provider unavailable",
      outboxId: "outbox-1",
      retryable: true,
    })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({ success: true, queued: true })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
    expect(mocks.sentryCaptureMessage).not.toHaveBeenCalled()
  })

  it("terminalizes an outbox-backed non-retryable staff provider rejection", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "invalid request",
      outboxId: "outbox-1",
      retryable: false,
    })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({ success: false, error: "Failed to send email. Check the address or contact support." })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
      emailOutboxId: "outbox-1",
      failureReason: "invalid request",
    }))
  })

  it("coalesces another staff click while the same certificate resend is queued", async () => {
    mocks.reserveCertificateResend.mockResolvedValue({
      success: false,
      error: "A certificate resend is already queued for this actor",
    })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({ success: true, queued: true })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("does not contact the provider when the transactional staff reservation hits the cap", async () => {
    mocks.reserveCertificateResend.mockResolvedValue({
      success: false,
      error: "Maximum resends reached",
    })

    const result = await resendCertificateAsStaff(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "Maximum resends reached. Contact support if the patient still hasn't received their certificate.",
    })
    expect(mocks.reserveCertificateResend).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
  })
})

describe("certificate reissue clinical authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: {
        id: DOCTOR_ID,
        role: "doctor",
        can_review_med_certs: false,
      },
    })
    mocks.doctorHasCapability.mockReturnValue(true)
    mocks.createServiceRoleClient.mockReturnValue(createReissueSupabase())
    mocks.getCertificateForIntake.mockResolvedValue({
      id: CERTIFICATE_ID,
      status: "valid",
      resend_count: 0,
      patient_name: "Test Patient",
      patient_dob: "1990-01-01",
      certificate_type: "work",
      start_date: "2026-07-10",
      end_date: "2026-07-10",
      issue_date: "2026-07-10",
      certificate_ref: "IM-WORK-TEST",
      certificate_number: "IM-WORK-TEST",
      verification_code: "VERIFY123",
      storage_path: "certificates/test.pdf",
    })
    mocks.getAbsenceDays.mockReturnValue(1)
    mocks.getDoctorIdentity.mockResolvedValue({ id: DOCTOR_ID })
    mocks.renderTemplatePdf.mockResolvedValue({ success: true, buffer: Buffer.from("pdf") })
    mocks.prepareCertificatePatientNameWrite.mockResolvedValue({
      patient_name: "Test Patient",
      patient_name_enc: "encrypted-patient-name",
    })
    mocks.getCertificateCorrectionCount.mockResolvedValue({ success: true, count: 0 })
    mocks.commitCertificateCorrection.mockResolvedValue({ success: true, correctionCount: 1 })
    mocks.storageUpload.mockResolvedValue({ error: null })
    mocks.storageRemove.mockResolvedValue({ error: null })
    mocks.logCertificateEvent.mockResolvedValue({ success: true })
    mocks.updateEmailStatus.mockResolvedValue({ success: true })
    mocks.reconcileCertificateEmailDelivery.mockResolvedValue({ success: true, failedSteps: [] })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "reissue-email-1" })
    mocks.medCertPatientEmail.mockReturnValue(null)
  })

  it("rejects a doctor who is not configured to review medical certificates", async () => {
    mocks.doctorHasCapability.mockReturnValue(false)

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({
      success: false,
      error: "Your account is not configured to review medical certificates. Contact the medical director.",
    })
    expect(mocks.doctorHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ id: DOCTOR_ID }),
      "review_med_certs",
    )
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("prevents a doctor from reissuing their own medical certificate", async () => {
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { patient_id: DOCTOR_ID },
              error: null,
            })),
          })),
        })),
      })),
    })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Doctor Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({
      success: false,
      error: "You cannot reissue your own medical certificate. Please have another doctor review this correction.",
    })
    expect(mocks.getCertificateForIntake).not.toHaveBeenCalled()
  })

  it("uses durable correction events instead of resend_count and atomically switches to a versioned PDF", async () => {
    mocks.getCertificateForIntake.mockResolvedValueOnce({
      ...await mocks.getCertificateForIntake(),
      resend_count: 3,
    })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({ success: true, certificateId: CERTIFICATE_ID })
    expect(mocks.getCertificateCorrectionCount).toHaveBeenCalledWith(CERTIFICATE_ID)
    const [newStoragePath, , uploadOptions] = mocks.storageUpload.mock.calls[0]
    expect(newStoragePath).not.toBe("certificates/test.pdf")
    expect(newStoragePath).toMatch(
      new RegExp(`^certificates/corrections/${CERTIFICATE_ID}/[0-9a-f-]+\\.pdf$`),
    )
    expect(uploadOptions).toEqual(expect.objectContaining({
      contentType: "application/pdf",
      upsert: false,
    }))
    expect(mocks.commitCertificateCorrection).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: CERTIFICATE_ID,
      expectedStoragePath: "certificates/test.pdf",
      newStoragePath,
      actorId: DOCTOR_ID,
      actorRole: "doctor",
    }))
    expect(mocks.issuedCertificateUpdate).not.toHaveBeenCalled()
    expect(mocks.logCertificateEvent).not.toHaveBeenCalledWith(
      CERTIFICATE_ID,
      "superseded",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: CERTIFICATE_ID,
      metadata: expect.objectContaining({
        certificate_storage_version: expect.any(String),
      }),
    }))
  })

  it("blocks a fourth correction from the durable correction audit count", async () => {
    mocks.getCertificateCorrectionCount.mockResolvedValueOnce({ success: true, count: 3 })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({
      success: false,
      error: "Maximum corrections reached (3). Contact support.",
    })
    expect(mocks.storageUpload).not.toHaveBeenCalled()
    expect(mocks.commitCertificateCorrection).not.toHaveBeenCalled()
  })

  it("removes only the newly uploaded correction when the atomic commit or audit fails", async () => {
    mocks.commitCertificateCorrection.mockResolvedValueOnce({
      success: false,
      error: "audit insert failed",
    })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({ success: false, error: "Failed to update certificate record" })
    const newStoragePath = mocks.storageUpload.mock.calls[0][0]
    expect(mocks.storageRemove).toHaveBeenCalledWith([newStoragePath])
    expect(mocks.storageRemove).not.toHaveBeenCalledWith(["certificates/test.pdf"])
    expect(mocks.revalidateStaff).not.toHaveBeenCalled()
    expect(mocks.revalidatePatient).not.toHaveBeenCalled()
  })

  it("sends an unlinked guest through account completion and records successful updated-certificate delivery", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createReissueSupabase(null))

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
      notifyPatient: true,
    })

    expect(result).toEqual({ success: true, certificateId: CERTIFICATE_ID })
    expect(mocks.medCertPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      dashboardUrl: expect.stringMatching(/\/track\/[A-Za-z0-9_-]+$/),
      isGuest: true,
    }))
    expect(mocks.reconcileCertificateEmailDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeId: INTAKE_ID,
        certificateId: CERTIFICATE_ID,
        outcome: "sent",
        providerMessageId: "reissue-email-1",
        actorId: DOCTOR_ID,
        actorRole: "doctor",
        source: "correction",
        eventData: { reissue_notification: true },
      }),
    )
  })

  it("sends a linked patient back to the authenticated intake detail", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createReissueSupabase("auth-patient-1"))

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
      notifyPatient: true,
    })

    expect(result).toEqual({ success: true, certificateId: CERTIFICATE_ID })
    expect(mocks.medCertPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      dashboardUrl: expect.stringContaining(`/patient/intakes/${INTAKE_ID}`),
      isGuest: false,
    }))
  })

  it("records failed updated-certificate delivery without rolling back the completed correction", async () => {
    mocks.sendEmail.mockResolvedValueOnce({ success: false, error: "provider unavailable" })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
      notifyPatient: true,
    })

    expect(result).toEqual({ success: true, certificateId: CERTIFICATE_ID })
    expect(mocks.reconcileCertificateEmailDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeId: INTAKE_ID,
        certificateId: CERTIFICATE_ID,
        outcome: "failed",
        failureReason: "provider unavailable",
        actorId: DOCTOR_ID,
        actorRole: "doctor",
        source: "correction",
        eventData: { reissue_notification: true },
      }),
    )
  })

  it("leaves a retryable updated-certificate notification queued instead of marking it failed", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "provider unavailable",
      outboxId: "outbox-correction-1",
      retryable: true,
    })

    const result = await reissueCertificateAction({
      intakeId: INTAKE_ID,
      patientName: "Test Patient",
      patientDob: "1990-01-01",
      certificateType: "work",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
      medicalReason: "date correction",
    })

    expect(result).toEqual({ success: true, certificateId: CERTIFICATE_ID })
    expect(mocks.reconcileCertificateEmailDelivery).not.toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    )
  })
})
