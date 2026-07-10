import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logCertificateEvent: vi.fn(),
  revalidateStaff: vi.fn(),
  updateEmailStatus: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: mocks.revalidateStaff,
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  logCertificateEvent: mocks.logCertificateEvent,
  updateEmailStatus: mocks.updateEmailStatus,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { reconcileCertificateEmailDelivery } from "@/lib/medical-certificates/email-delivery-reconciliation"

const CERTIFICATE_ID = "33333333-3333-4333-8333-333333333333"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const STORAGE_PATH = "certificates/current.pdf"
const STORAGE_VERSION = getEmployerCertificateStorageVersion(STORAGE_PATH)

function mockCertificateLookup(storagePath = STORAGE_PATH) {
  mocks.createServiceRoleClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: CERTIFICATE_ID,
              intake_id: INTAKE_ID,
              status: "valid",
              storage_path: storagePath,
            },
            error: null,
          })),
        })),
      })),
    })),
  })
}

describe("non-resend certificate email delivery reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCertificateLookup()
    mocks.updateEmailStatus.mockResolvedValue({ success: true })
    mocks.logCertificateEvent.mockResolvedValue({ success: true })
  })

  it("records a provider-accepted email against the exact document version", async () => {
    const result = await reconcileCertificateEmailDelivery({
      intakeId: INTAKE_ID,
      certificateId: CERTIFICATE_ID,
      expectedStorageVersion: STORAGE_VERSION,
      outcome: "sent",
      providerMessageId: "provider-message-1",
      outboxId: "outbox-1",
      actorId: null,
      actorRole: "system",
      source: "initial_approval",
    })

    expect(result).toEqual({ success: true, failedSteps: [] })
    expect(mocks.updateEmailStatus).toHaveBeenCalledWith(CERTIFICATE_ID, "sent", {
      deliveryId: "provider-message-1",
      expectedStoragePath: STORAGE_PATH,
    })
    expect(mocks.logCertificateEvent).toHaveBeenCalledWith(
      CERTIFICATE_ID,
      "email_sent",
      null,
      "system",
      expect.objectContaining({
        certificate_storage_version: STORAGE_VERSION,
        delivery_source: "initial_approval",
        outbox_id: "outbox-1",
        resend_id: "provider-message-1",
      }),
    )
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it("retries the status and audit writes independently without another provider send", async () => {
    mocks.updateEmailStatus
      .mockResolvedValueOnce({ success: false, error: "status write unavailable" })
      .mockResolvedValueOnce({ success: true })
    mocks.logCertificateEvent
      .mockResolvedValueOnce({ success: false, error: "audit write unavailable" })
      .mockResolvedValueOnce({ success: true })

    const result = await reconcileCertificateEmailDelivery({
      intakeId: INTAKE_ID,
      certificateId: CERTIFICATE_ID,
      expectedStorageVersion: STORAGE_VERSION,
      outcome: "sent",
      providerMessageId: "provider-message-1",
      actorId: "44444444-4444-4444-8444-444444444444",
      actorRole: "doctor",
      source: "correction",
    })

    expect(result).toEqual({ success: true, failedSteps: [] })
    expect(mocks.updateEmailStatus).toHaveBeenCalledTimes(2)
    expect(mocks.logCertificateEvent).toHaveBeenCalledTimes(2)
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it("alerts operations when a bookkeeping write still fails after its retry", async () => {
    mocks.updateEmailStatus.mockResolvedValue({
      success: false,
      error: "certificate status unavailable",
    })

    const result = await reconcileCertificateEmailDelivery({
      intakeId: INTAKE_ID,
      certificateId: CERTIFICATE_ID,
      expectedStorageVersion: STORAGE_VERSION,
      outcome: "sent",
      providerMessageId: "provider-message-1",
      actorId: null,
      actorRole: "system",
      source: "outbox_dispatcher",
      outboxId: "outbox-1",
    })

    expect(result).toEqual({ success: false, failedSteps: ["email_status"] })
    expect(mocks.updateEmailStatus).toHaveBeenCalledTimes(2)
    expect(mocks.logCertificateEvent).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Certificate email delivery reconciliation failed",
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({
          subsystem: "certificate-email-delivery-reconciliation",
          delivery_outcome: "sent",
        }),
        extra: expect.objectContaining({
          failedSteps: ["email_status"],
          outboxId: "outbox-1",
        }),
      }),
    )
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      ops: true,
      emails: true,
    })
  })

  it("refuses to reconcile an email for a superseded storage version", async () => {
    mockCertificateLookup("certificates/corrected.pdf")

    const result = await reconcileCertificateEmailDelivery({
      intakeId: INTAKE_ID,
      certificateId: CERTIFICATE_ID,
      expectedStorageVersion: STORAGE_VERSION,
      outcome: "sent",
      providerMessageId: "provider-message-1",
      actorId: null,
      actorRole: "system",
      source: "outbox_dispatcher",
      outboxId: "outbox-1",
    })

    expect(result).toEqual({
      success: false,
      failedSteps: ["certificate_version"],
    })
    expect(mocks.updateEmailStatus).not.toHaveBeenCalled()
    expect(mocks.logCertificateEvent).not.toHaveBeenCalled()
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
  })

  it("records a terminal provider failure without claiming the document was sent", async () => {
    const result = await reconcileCertificateEmailDelivery({
      intakeId: INTAKE_ID,
      certificateId: CERTIFICATE_ID,
      expectedStorageVersion: STORAGE_VERSION,
      outcome: "failed",
      failureReason: "provider rejected request",
      outboxId: "outbox-1",
      actorId: "44444444-4444-4444-8444-444444444444",
      actorRole: "doctor",
      source: "correction",
      eventData: { reissue_notification: true },
    })

    expect(result).toEqual({ success: true, failedSteps: [] })
    expect(mocks.updateEmailStatus).toHaveBeenCalledWith(CERTIFICATE_ID, "failed", {
      failureReason: "provider rejected request",
      expectedStoragePath: STORAGE_PATH,
    })
    expect(mocks.logCertificateEvent).toHaveBeenCalledWith(
      CERTIFICATE_ID,
      "email_failed",
      "44444444-4444-4444-8444-444444444444",
      "doctor",
      expect.objectContaining({
        certificate_storage_version: STORAGE_VERSION,
        error: "provider rejected request",
        reissue_notification: true,
      }),
    )
  })
})
