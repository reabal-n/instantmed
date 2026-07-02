import { describe, expect, it } from "vitest"

import {
  buildCertificateDeliveryRescueCase,
  type CertificateDeliveryEvidence,
  getCertificateDeliveryRescueCases,
  interpretEmailDelivery,
  selectCertificateDeliverySupportAction,
} from "@/lib/admin/certificate-delivery-rescue"

const baseEvidence: CertificateDeliveryEvidence = {
  intakeId: "12345678-1234-4000-8000-000000000001",
  referenceNumber: "IM-TEST",
  intakeStatus: "approved",
}

function createRescueSupabaseStub(results: Record<string, unknown[]>) {
  const filterCalls: Array<{ table: string; method: "or" | "not"; args: unknown[] }> = []

  return {
    filterCalls,
    from(table: string) {
      const result = { data: results[table] ?? [], error: null }
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        in: () => query,
        or: (...args: unknown[]) => {
          filterCalls.push({ table, method: "or", args })
          return query
        },
        not: (...args: unknown[]) => {
          filterCalls.push({ table, method: "not", args })
          return query
        },
        order: () => query,
        limit: () => Promise.resolve(result),
        then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      }

      return query
    },
  }
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

  it("does not count safe downloaded timestamp drift as a rescue warning", async () => {
    const supabase = createRescueSupabaseStub({
      intakes: [
        {
          id: baseEvidence.intakeId,
          reference_number: baseEvidence.referenceNumber,
          status: "approved",
          document_sent_at: null,
          created_at: "2026-06-29T00:00:00Z",
          updated_at: "2026-06-29T00:06:00Z",
          approved_at: "2026-06-29T00:01:00Z",
          completed_at: null,
        },
      ],
      issued_certificates: [
        {
          id: "cert-downloaded",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          created_at: "2026-06-29T00:02:00Z",
          email_sent_at: "2026-06-29T00:03:00Z",
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
      ],
      email_outbox: [
        {
          intake_id: baseEvidence.intakeId,
          email_type: "med_cert_patient",
          status: "sent",
          delivery_status: "delivered",
          sent_at: "2026-06-29T00:03:00Z",
          created_at: "2026-06-29T00:03:00Z",
        },
      ],
      certificate_audit_log: [
        {
          certificate_id: "cert-downloaded",
          created_at: "2026-06-29T00:05:00Z",
        },
      ],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases).toHaveLength(1)
    expect(overview.cases[0]?.recommendation.action).toBe("none")
    expect(overview.cases[0]?.warnings).toContain("document_sent_at missing")
    expect(overview.actionCount).toBe(0)
    expect(overview.warningCount).toBe(0)
  })

  it("counts queued certificate email delivery as a watch-only warning", async () => {
    const supabase = createRescueSupabaseStub({
      intakes: [
        {
          id: baseEvidence.intakeId,
          reference_number: baseEvidence.referenceNumber,
          status: "approved",
          document_sent_at: null,
          created_at: "2026-06-29T00:00:00Z",
          updated_at: "2026-06-29T00:04:00Z",
          approved_at: "2026-06-29T00:01:00Z",
          completed_at: null,
        },
      ],
      issued_certificates: [
        {
          id: "cert-queued",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          created_at: "2026-06-29T00:02:00Z",
          email_sent_at: null,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
      ],
      email_outbox: [
        {
          intake_id: baseEvidence.intakeId,
          email_type: "med_cert_patient",
          status: "pending",
          delivery_status: null,
          sent_at: null,
          created_at: "2026-06-29T00:03:00Z",
        },
      ],
      certificate_audit_log: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases).toHaveLength(1)
    expect(overview.cases[0]?.recommendation).toMatchObject({
      action: "none",
      severity: "warning",
    })
    expect(overview.actionCount).toBe(0)
    expect(overview.warningCount).toBe(1)
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

  it("scopes the rescue query to reportable intakes (seeded-E2E + exclude_from_reporting filtered)", async () => {
    // The panel must mirror the production scope of the
    // ops_certificate_sent_missing_timestamp invariant: test rows inflating
    // the panel while the alert ignores them leaves the operator chasing
    // phantom cases that can never clear the alert.
    const supabase = createRescueSupabaseStub({ intakes: [] })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.queryFailed).toBe(false)
    const intakeFilters = supabase.filterCalls.filter((call) => call.table === "intakes")
    expect(intakeFilters).toContainEqual({
      table: "intakes",
      method: "or",
      args: ["exclude_from_reporting.is.null,exclude_from_reporting.eq.false"],
    })
    expect(
      intakeFilters.some((call) => call.method === "not" && call.args[0] === "patient_id"),
    ).toBe(true)
  })
})
