import { beforeEach, describe, expect, it, vi } from "vitest"

const ids = {
  intake: "11111111-1111-4111-8111-111111111111",
  patient: "22222222-2222-4222-8222-222222222222",
  certificate: "33333333-3333-4333-8333-333333333333",
  operator: "44444444-4444-4444-8444-444444444444",
} as const

const h = vi.hoisted(() => ({
  approvalMode: false,
  patientAuthUserId: "55555555-5555-4555-8555-555555555555" as string | null,
  renderedHtml: "",
  sendEmail: vi.fn(),
  reserveCertificateResend: vi.fn(),
  finalizeCertificateResend: vi.fn(),
  reconcileCertificateResendAttempts: vi.fn(),
  atomicApproveCertificate: vi.fn(),
  renderTemplatePdf: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "https://instantmed.example",
    resendApiKey: "",
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: vi.fn(async () => ({ profile: { id: ids.patient, role: "patient" } })),
  requireRole: vi.fn(async () => ({ profile: { id: ids.operator, role: "admin" } })),
}))

vi.mock("@/lib/rate-limit/resend-cert", () => ({
  checkResendRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  atomicApproveCertificate: h.atomicApproveCertificate,
  compareForEdits: vi.fn(() => []),
  findExistingCertificate: vi.fn(async () => null),
  getCertificateById: vi.fn(async () => ({
    id: ids.certificate,
    intake_id: ids.intake,
    patient_id: ids.patient,
    patient_name: "Synthetic Patient",
    certificate_type: "work",
    status: "valid",
    storage_path: "certificates/synthetic-current.pdf",
    verification_code: "SYNTH-VERIFY",
    email_retry_count: 0,
    resend_count: 0,
  })),
  getCertificateForIntake: vi.fn(async () => ({
    id: ids.certificate,
    intake_id: ids.intake,
    patient_id: ids.patient,
    patient_name: "Synthetic Patient",
    certificate_type: "work",
    status: "valid",
    storage_path: "certificates/synthetic-current.pdf",
    verification_code: "SYNTH-VERIFY",
    email_retry_count: 0,
    resend_count: 0,
  })),
  reserveCertificateResend: h.reserveCertificateResend,
  finalizeCertificateResend: h.finalizeCertificateResend,
  reconcileCertificateResendAttempts: h.reconcileCertificateResendAttempts,
  logCertificateEdits: vi.fn(async () => ({ editCount: 0, errors: [] })),
  logCertificateEvent: vi.fn(async () => undefined),
}))

vi.mock("@/lib/clinical/manual-cert-claim", () => ({
  claimIntakeForManualCertApproval: vi.fn(async () => ({ success: true })),
}))

vi.mock("@/lib/data/doctor-identity", () => ({
  getDoctorIdentity: vi.fn(async () => ({ nominals: "MBBS" })),
}))

vi.mock("@/lib/pdf/template-renderer", () => ({
  renderTemplatePdf: h.renderTemplatePdf,
}))

vi.mock("@/lib/pdf/cert-identifiers", () => ({
  generateCertificateNumber: vi.fn(() => "MC-SYNTH-001"),
  generateCertificateRef: vi.fn(() => "MC-WORK-SYNTH"),
  generateVerificationCode: vi.fn(() => "SYNTH-VERIFY"),
}))

vi.mock("@/lib/medical-certificates/email-delivery-reconciliation", () => ({
  reconcileCertificateEmailDelivery: vi.fn(async () => ({ success: true, failedSteps: [] })),
}))

vi.mock("@/lib/notifications/service", () => ({
  createNotification: vi.fn(async () => undefined),
}))

vi.mock("@/lib/notifications/edit-paid-request-telegram", () => ({
  editPaidRequestTelegramMessageToApproved: vi.fn(async () => undefined),
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: vi.fn(),
  trackIntakeFunnelStep: vi.fn(),
}))

vi.mock("@/lib/stripe/price-mapping", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/price-mapping")>()),
  getAbsenceDays: vi.fn(() => 1),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        if (h.approvalMode) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: ids.intake,
                    status: "paid",
                    subtype: "work",
                    service: {
                      id: "synthetic-service",
                      slug: "medical-certificate",
                      name: "Medical Certificate",
                      type: "med_certs",
                    },
                    patient: {
                      id: ids.patient,
                      full_name: "Synthetic Patient",
                      email: "patient@example.test",
                      date_of_birth: "1990-01-01",
                      referral_code: null,
                      auth_user_id: h.patientAuthUserId,
                    },
                    answers: [{ answers: { duration: "1" } }],
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: ids.intake,
                  patient_id: ids.patient,
                  status: "approved",
                  patient: {
                    id: ids.patient,
                    full_name: "Synthetic Patient",
                    email: "patient@example.test",
                    auth_user_id: h.patientAuthUserId,
                  },
                },
                error: null,
              })),
            })),
          })),
        }
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { auth_user_id: h.patientAuthUserId },
                error: null,
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table in certificate email entry-point test: ${table}`)
    }),
    rpc: vi.fn(async () => ({ error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        remove: vi.fn(async () => ({ error: null })),
      })),
    },
  })),
}))

vi.mock("@/lib/email/send-email", async () => {
  const { renderEmailToHtml } = await import("@/lib/email/react-renderer-server")
  h.sendEmail.mockImplementation(async (params: { template: React.ReactElement }) => {
    h.renderedHtml = await renderEmailToHtml(params.template)
    return { success: true, messageId: "synthetic-provider-message", outboxId: "synthetic-outbox" }
  })
  return { sendEmail: h.sendEmail }
})

import {
  resendCertificate,
  resendCertificateAsStaff,
} from "@/app/actions/resend-certificate"
import { executeCertApproval } from "@/lib/clinical/execute-cert-approval"
import { reconstructEmailContent } from "@/lib/email/send/reconstruct"
import type { OutboxRow } from "@/lib/email/send/types"

function expectSecureCertificateEmail(html: string, guest: boolean) {
  expect(html).toContain("SYNTH-VERIFY")
  expect(html).toContain(guest ? "Set up access &amp; view certificate" : "View Certificate")
  expect(html).not.toContain("certificates/synthetic-current.pdf")
  expect(html).not.toContain("supabase")
}

describe("certificate email rendering entry points", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.approvalMode = false
    h.patientAuthUserId = "55555555-5555-4555-8555-555555555555"
    h.renderedHtml = ""
    h.reserveCertificateResend.mockResolvedValue({
      success: true,
      attemptStatus: "reserved",
    })
    h.finalizeCertificateResend.mockResolvedValue({
      success: true,
      isDuplicate: false,
    })
    h.reconcileCertificateResendAttempts.mockResolvedValue({
      success: true,
      reconciledCount: 0,
    })
    h.atomicApproveCertificate.mockResolvedValue({
      success: true,
      certificateId: ids.certificate,
      isExisting: false,
    })
    h.renderTemplatePdf.mockResolvedValue({
      success: true,
      buffer: Buffer.from("synthetic-pdf"),
    })
  })

  it("renders normal approval through executeCertApproval and its real static template", async () => {
    h.approvalMode = true
    const today = new Date().toISOString().slice(0, 10)

    const result = await executeCertApproval({
      intakeId: ids.intake,
      reviewData: {
        doctorName: "Synthetic Operator",
        consultDate: today,
        startDate: today,
        endDate: today,
        medicalReason: "Synthetic mild illness",
      },
      doctorProfile: {
        id: ids.operator,
        full_name: "Synthetic Operator",
        provider_number: "7654321B",
        ahpra_number: "MED0007654321",
      },
      skipClaim: true,
    })

    expect(result).toMatchObject({ success: true, certificateId: ids.certificate })
    expect(h.renderTemplatePdf).toHaveBeenCalledOnce()
    expect(h.atomicApproveCertificate).toHaveBeenCalledOnce()
    expect(h.sendEmail).toHaveBeenCalledOnce()
    expectSecureCertificateEmail(h.renderedHtml, false)
  })

  it("renders the patient self-resend action through its real static template import", async () => {
    const result = await resendCertificate(ids.intake)

    expect(result).toEqual({ success: true })
    expect(h.sendEmail).toHaveBeenCalledOnce()
    expectSecureCertificateEmail(h.renderedHtml, false)
  })

  it("renders the staff resend action through its real static template import", async () => {
    h.patientAuthUserId = null

    const result = await resendCertificateAsStaff(ids.intake)

    expect(result).toEqual({ success: true })
    expect(h.sendEmail).toHaveBeenCalledOnce()
    expectSecureCertificateEmail(h.renderedHtml, true)
  })

  it("renders a no-frozen-payload email-hub retry through the dynamic template barrel", async () => {
    h.patientAuthUserId = null
    const row: OutboxRow = {
      id: "synthetic-outbox-retry",
      email_type: "med_cert_patient",
      to_email: "patient@example.test",
      to_name: "Synthetic Patient",
      subject: "Synthetic certificate retry",
      status: "sending",
      retry_count: 1,
      last_attempt_at: "2026-09-04T00:00:00.000Z",
      intake_id: ids.intake,
      patient_id: ids.patient,
      certificate_id: ids.certificate,
      metadata: {
        certificate_storage_version: "0123456789abcdef0123456789abcdef",
      },
    }

    const result = await reconstructEmailContent(row)

    expect(result.success).toBe(true)
    expectSecureCertificateEmail(result.html ?? "", true)
  })
})
