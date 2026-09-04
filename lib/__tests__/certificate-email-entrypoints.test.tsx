import { beforeEach, describe, expect, it, vi } from "vitest"

const ids = {
  intake: "11111111-1111-4111-8111-111111111111",
  patient: "22222222-2222-4222-8222-222222222222",
  certificate: "33333333-3333-4333-8333-333333333333",
  operator: "44444444-4444-4444-8444-444444444444",
} as const

const h = vi.hoisted(() => ({
  patientAuthUserId: "55555555-5555-4555-8555-555555555555" as string | null,
  renderedHtml: "",
  sendEmail: vi.fn(),
  reserveCertificateResend: vi.fn(),
  finalizeCertificateResend: vi.fn(),
  reconcileCertificateResendAttempts: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setTag: vi.fn(),
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
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "intakes") {
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
import { MedCertPatientEmail } from "@/lib/email/components/templates"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
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
  })

  it("renders the normal approval control through the real static template barrel", async () => {
    const html = await renderEmailToHtml(MedCertPatientEmail({
      patientName: "Synthetic Patient",
      dashboardUrl: `https://instantmed.example/patient/intakes/${ids.intake}`,
      verificationCode: "SYNTH-VERIFY",
      certType: "work",
      appUrl: "https://instantmed.example",
      isGuest: false,
    }))

    expectSecureCertificateEmail(html, false)
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
