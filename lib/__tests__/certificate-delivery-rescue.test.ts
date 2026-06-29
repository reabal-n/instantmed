import { describe, expect, it } from "vitest"

import {
  buildCertificateDeliveryRescueCase,
  type CertificateDeliveryEvidence,
  interpretEmailDelivery,
  selectCertificateDeliverySupportAction,
} from "@/lib/admin/certificate-delivery-rescue"

const baseEvidence: CertificateDeliveryEvidence = {
  intakeId: "12345678-1234-4000-8000-000000000001",
  referenceNumber: "IM-TEST",
  intakeStatus: "approved",
}

describe("certificate delivery rescue", () => {
  it("normalizes queued, sent, delivered, clicked, and failed email states", () => {
    expect(interpretEmailDelivery({ status: "pending", createdAt: "2026-06-29T00:00:00Z" })).toMatchObject({
      kind: "queued",
      label: "pending",
    })
    expect(interpretEmailDelivery({ status: "sent", sentAt: "2026-06-29T00:01:00Z" })).toMatchObject({
      kind: "sent",
      label: "sent",
    })
    expect(interpretEmailDelivery({ status: "sent", deliveryStatus: "delivered" })).toMatchObject({
      kind: "delivered",
      label: "delivered",
    })
    expect(interpretEmailDelivery({ status: "sent", deliveryStatus: "clicked" })).toMatchObject({
      kind: "clicked",
      label: "clicked",
    })
    expect(interpretEmailDelivery({ status: "sent", deliveryStatus: "bounced" })).toMatchObject({
      kind: "failed",
      label: "bounced",
    })
  })

  it("recommends no patient action when the certificate was downloaded, even if document_sent_at is missing", () => {
    const row = buildCertificateDeliveryRescueCase({
      ...baseEvidence,
      documentSentAt: null,
      certificateId: "cert-1",
      certificateStatus: "valid",
      certificateEmailSentAt: "2026-06-29T00:02:00Z",
      certificateEmail: {
        status: "sent",
        deliveryStatus: "delivered",
        sentAt: "2026-06-29T00:02:00Z",
      },
      downloadedAt: "2026-06-29T00:05:00Z",
    })

    expect(row.recommendation.action).toBe("none")
    expect(row.recommendation.reason).toContain("downloaded")
    expect(row.accessEvidence).toBe("downloaded")
    expect(row.warnings).toContain("document_sent_at missing")
  })

  it("recommends resending the secure link when a generated certificate email failed", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      certificateId: "cert-2",
      certificateStatus: "valid",
      certificateEmail: {
        status: "failed",
        createdAt: "2026-06-29T00:03:00Z",
      },
    })

    expect(recommendation).toMatchObject({
      action: "resend_secure_link",
      label: "Resend secure link",
      severity: "critical",
    })
  })

  it("recommends resending the secure link when the certificate exists but no patient certificate email is visible", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      certificateId: "cert-3",
      certificateStatus: "valid",
      certificateEmail: null,
    })

    expect(recommendation.action).toBe("resend_secure_link")
    expect(recommendation.reason).toContain("no patient certificate email")
  })

  it("escalates approved or completed intakes that have no certificate record", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      intakeStatus: "completed",
      certificateId: null,
    })

    expect(recommendation).toMatchObject({
      action: "escalate",
      severity: "critical",
    })
  })

  it("selects receipt resend only before certificate generation when the receipt email failed", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      intakeStatus: "paid",
      certificateId: null,
      receiptEmail: {
        status: "failed",
        createdAt: "2026-06-29T00:04:00Z",
      },
    })

    expect(recommendation).toMatchObject({
      action: "resend_receipt",
      label: "Resend receipt",
      severity: "warning",
    })
  })

  it("does not expose patient contact details in the derived rescue case", () => {
    const row = buildCertificateDeliveryRescueCase({
      ...baseEvidence,
      certificateId: "cert-4",
      certificateStatus: "valid",
      certificateEmail: {
        status: "sent",
        deliveryStatus: "clicked",
        sentAt: "2026-06-29T00:02:00Z",
      },
    })

    expect(JSON.stringify(row)).not.toMatch(/@|patientName|full_name|to_email|patient_email|storage_path/i)
  })
})
