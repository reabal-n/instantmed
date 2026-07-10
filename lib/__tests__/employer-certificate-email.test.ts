import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getCertificateById: vi.fn(),
  getCertificateForIntake: vi.fn(),
  getDownloadHref: vi.fn(),
  checkRateLimit: vi.fn(),
  sendEmail: vi.fn(),
  employerTemplate: vi.fn(),
  renderEmailToHtml: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/config/env", () => ({
  env: { appUrl: "https://instantmed.test" },
}))

vi.mock("@/lib/config/kill-switches", () => ({
  checkEmployerEmailBlocked: () => ({ blocked: false }),
}))

vi.mock("@/lib/crypto/employer-certificate-token", () => ({
  getEmployerCertificateDownloadHref: mocks.getDownloadHref,
  getEmployerCertificateStorageVersion: vi.fn(() => "storage-version-1"),
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateById: mocks.getCertificateById,
  getCertificateForIntake: mocks.getCertificateForIntake,
}))

vi.mock("@/lib/email/send-email", () => ({
  checkEmployerEmailRateLimit: mocks.checkRateLimit,
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/email/components/templates", () => ({
  MedCertEmployerEmail: mocks.employerTemplate,
  medCertEmployerEmailSubject: () => "Medical certificate",
}))

vi.mock("@/lib/email/components/templates/med-cert-employer", () => ({
  MedCertEmployerEmail: mocks.employerTemplate,
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@sentry/nextjs", () => ({
  setTag: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

import { sendEmployerEmail } from "@/app/actions/send-employer-email"
import { reconstructEmailContent } from "@/lib/email/send/reconstruct"
import type { OutboxRow } from "@/lib/email/send/types"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const certificate = {
  id: CERTIFICATE_ID,
  intake_id: INTAKE_ID,
  status: "valid",
  storage_path: "certificates/corrections/cert/version-2.pdf",
  patient_name: "Test Patient",
  verification_code: "VERIFY123",
  start_date: "2026-07-10",
  end_date: "2026-07-10",
}

function intakeClient(status: "approved" | "completed" = "completed") {
  return {
    from: vi.fn((table: string) => {
      if (table !== "intakes") throw new Error(`Unexpected table ${table}`)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: INTAKE_ID, patient_id: PATIENT_ID, status },
              error: null,
            })),
          })),
        })),
      }
    }),
  }
}

describe("employer certificate email current-version access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({ profile: { id: PATIENT_ID, role: "patient" } })
    mocks.createServiceRoleClient.mockReturnValue(intakeClient())
    mocks.getCertificateById.mockResolvedValue(certificate)
    mocks.getCertificateForIntake.mockResolvedValue(certificate)
    mocks.getDownloadHref.mockReturnValue(
      `/api/employer/certificates/${CERTIFICATE_ID}/download?token=version-bound`,
    )
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, currentCount: 0 })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "employer-email-1" })
    mocks.employerTemplate.mockReturnValue(null)
    mocks.renderEmailToHtml.mockResolvedValue("<html>employer email</html>")
  })

  it("accepts completed requests and sends only an app-controlled current-version link", async () => {
    const result = await sendEmployerEmail({
      intakeId: INTAKE_ID,
      employerEmail: "manager@example.test",
    })

    expect(result).toEqual({ success: true, remainingSends: 2 })
    expect(mocks.getCertificateForIntake).toHaveBeenCalledWith(INTAKE_ID)
    expect(mocks.getDownloadHref).toHaveBeenCalledWith(
      CERTIFICATE_ID,
      certificate.storage_path,
    )
    expect(mocks.employerTemplate).toHaveBeenCalledWith(expect.objectContaining({
      downloadUrl: expect.stringMatching(
        /^https:\/\/instantmed\.test\/api\/employer\/certificates\//,
      ),
      expiresInDays: 7,
    }))
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        certificate_storage_version: "storage-version-1",
      }),
    }))
  })

  it("reports a retryable outbox failure as queued instead of inviting a duplicate send", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "provider unavailable",
      outboxId: "outbox-employer-1",
      retryable: true,
    })

    const result = await sendEmployerEmail({
      intakeId: INTAKE_ID,
      employerEmail: "manager@example.test",
    })

    expect(result).toEqual({ success: true, queued: true, remainingSends: 2 })
  })

  it("fails closed when no current valid certificate exists", async () => {
    mocks.getCertificateForIntake.mockResolvedValueOnce(null)

    const result = await sendEmployerEmail({
      intakeId: INTAKE_ID,
      employerEmail: "manager@example.test",
    })

    expect(result).toEqual({ success: false, error: "No current certificate found for this request" })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.getDownloadHref).not.toHaveBeenCalled()
  })

  it("reconstructs retries only for the same current valid certificate version", async () => {
    const result = await reconstructEmailContent({
      id: "outbox-1",
      email_type: "med_cert_employer",
      to_email: "manager@example.test",
      to_name: null,
      subject: "Medical certificate",
      status: "failed",
      retry_count: 1,
      last_attempt_at: null,
      intake_id: INTAKE_ID,
      patient_id: PATIENT_ID,
      certificate_id: CERTIFICATE_ID,
      metadata: null,
    } satisfies OutboxRow)

    expect(result).toEqual({ success: true, html: "<html>employer email</html>" })
    expect(mocks.getCertificateById).toHaveBeenCalledWith(CERTIFICATE_ID)
    expect(mocks.getCertificateForIntake).toHaveBeenCalledWith(INTAKE_ID)
    expect(mocks.getDownloadHref).toHaveBeenCalledWith(CERTIFICATE_ID, certificate.storage_path)
  })

  it("refuses retry reconstruction after revocation, replacement, or correction drift", async () => {
    mocks.getCertificateForIntake.mockResolvedValueOnce({
      ...certificate,
      id: "new-current-certificate",
    })

    const result = await reconstructEmailContent({
      id: "outbox-1",
      email_type: "med_cert_employer",
      to_email: "manager@example.test",
      to_name: null,
      subject: "Medical certificate",
      status: "failed",
      retry_count: 1,
      last_attempt_at: null,
      intake_id: INTAKE_ID,
      patient_id: PATIENT_ID,
      certificate_id: CERTIFICATE_ID,
      metadata: null,
    } satisfies OutboxRow)

    expect(result).toEqual({
      success: false,
      error: "Certificate is no longer current for employer email reconstruction",
      terminal: true,
    })
    expect(mocks.getDownloadHref).not.toHaveBeenCalled()
  })

  it("refuses patient retry reconstruction for a revoked or superseded certificate", async () => {
    mocks.getCertificateById.mockResolvedValueOnce({
      ...certificate,
      status: "revoked",
    })

    const result = await reconstructEmailContent({
      id: "outbox-patient-1",
      email_type: "med_cert_patient",
      to_email: "patient@example.test",
      to_name: "Test Patient",
      subject: "Your certificate",
      status: "failed",
      retry_count: 1,
      last_attempt_at: null,
      intake_id: INTAKE_ID,
      patient_id: PATIENT_ID,
      certificate_id: CERTIFICATE_ID,
      metadata: null,
    } satisfies OutboxRow)

    expect(result).toEqual({
      success: false,
      error: "Certificate is no longer valid for patient email reconstruction",
      terminal: true,
    })
    expect(mocks.renderEmailToHtml).not.toHaveBeenCalled()
  })
})
