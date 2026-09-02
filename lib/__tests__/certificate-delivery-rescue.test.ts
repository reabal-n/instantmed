import { createHash } from "node:crypto"

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

function createRescueSupabaseStub(
  results: Record<string, unknown[]>,
  errors: Partial<Record<string, { message: string }>> = {},
) {
  const filterCalls: Array<{ table: string; method: "or" | "not" | "gte" | "in"; args: unknown[] }> = []
  const orderCalls: Array<{
    table: string
    field: string
    options: { ascending?: boolean } | undefined
  }> = []

  return {
    filterCalls,
    orderCalls,
    from(table: string) {
      const result = {
        count: (results[table] ?? []).length,
        data: results[table] ?? [],
        error: errors[table] ?? null,
      }
      const query = {
        select: () => query,
        eq: () => query,
        gte: (...args: unknown[]) => {
          filterCalls.push({ table, method: "gte", args })
          return query
        },
        in: (...args: unknown[]) => {
          filterCalls.push({ table, method: "in", args })
          return query
        },
        or: (...args: unknown[]) => {
          filterCalls.push({ table, method: "or", args })
          return query
        },
        not: (...args: unknown[]) => {
          filterCalls.push({ table, method: "not", args })
          return query
        },
        order: (field: string, options?: { ascending?: boolean }) => {
          orderCalls.push({ table, field, options })
          return query
        },
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
    const storagePath = "certificates/downloaded/current.pdf"
    const storageVersion = createHash("sha256")
      .update(storagePath)
      .digest("hex")
      .slice(0, 32)
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
          storage_path: storagePath,
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
          actor_role: "patient",
          event_data: { certificate_storage_version: storageVersion },
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

  it("does not let a stale patient download suppress rescue for a corrected storage version", async () => {
    const currentStoragePath = "certificates/downloaded/version-two.pdf"
    const staleStorageVersion = createHash("sha256")
      .update("certificates/downloaded/version-one.pdf")
      .digest("hex")
      .slice(0, 32)
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
          id: "cert-corrected-download",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          storage_path: currentStoragePath,
          created_at: "2026-06-29T00:02:00Z",
          email_sent_at: null,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
      ],
      email_outbox: [],
      certificate_audit_log: [
        {
          certificate_id: "cert-corrected-download",
          actor_role: "patient",
          event_data: { certificate_storage_version: staleStorageVersion },
          created_at: "2026-06-29T00:05:00Z",
        },
      ],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases[0]?.recommendation.action).toBe("resend_secure_link")
    expect(overview.cases[0]?.accessEvidence).toBe("none")
  })

  it("does not treat an exact-version staff download as patient delivery evidence", async () => {
    const currentStoragePath = "certificates/downloaded/staff-viewed.pdf"
    const currentStorageVersion = createHash("sha256")
      .update(currentStoragePath)
      .digest("hex")
      .slice(0, 32)
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
          id: "cert-staff-download",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          storage_path: currentStoragePath,
          created_at: "2026-06-29T00:02:00Z",
          email_sent_at: null,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
      ],
      email_outbox: [],
      certificate_audit_log: [
        {
          certificate_id: "cert-staff-download",
          actor_role: "doctor",
          event_data: { certificate_storage_version: currentStorageVersion },
          created_at: "2026-06-29T00:05:00Z",
        },
      ],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases[0]?.recommendation.action).toBe("resend_secure_link")
    expect(overview.cases[0]?.accessEvidence).toBe("none")
  })

  it("fails closed when patient download evidence cannot be read", async () => {
    const supabase = createRescueSupabaseStub(
      {
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
            id: "cert-download-read-failure",
            intake_id: baseEvidence.intakeId,
            status: "valid",
            storage_path: "certificates/download-failure/current.pdf",
            created_at: "2026-06-29T00:02:00Z",
            email_sent_at: null,
            email_failed_at: null,
            email_failure_reason: null,
            resend_count: 0,
          },
        ],
        email_outbox: [],
      },
      { certificate_audit_log: { message: "audit read unavailable" } },
    )

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview).toMatchObject({
      cases: [],
      actionCount: 0,
      warningCount: 0,
      queryFailed: true,
    })
  })

  it("preserves SQL id-desc order when current certificates share a creation time", async () => {
    const tiedCreatedAt = "2026-06-29T00:02:00Z"
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
      // This is the database order required by created_at DESC, id DESC.
      issued_certificates: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          storage_path: "certificates/tie/current.pdf",
          created_at: tiedCreatedAt,
          email_sent_at: null,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
        {
          id: "00000000-0000-4000-8000-000000000001",
          intake_id: baseEvidence.intakeId,
          status: "superseded",
          storage_path: "certificates/tie/older.pdf",
          created_at: tiedCreatedAt,
          email_sent_at: null,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
      ],
      email_outbox: [],
      certificate_audit_log: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases[0]).toMatchObject({
      certificateStatus: "valid",
      recommendation: { action: "resend_secure_link" },
    })
    expect(
      supabase.orderCalls.filter((call) => call.table === "issued_certificates"),
    ).toEqual([
      { table: "issued_certificates", field: "created_at", options: { ascending: false } },
      { table: "issued_certificates", field: "id", options: { ascending: false } },
    ])
  })

  it("accepts manual reconciliation only for the current certificate storage version", async () => {
    const currentStoragePath = "certificates/current/version-two.pdf"
    const currentStorageVersion = createHash("sha256")
      .update(currentStoragePath)
      .digest("hex")
      .slice(0, 32)
    const buildVersionedStub = (reconciledStorageVersion: string) =>
      createRescueSupabaseStub({
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
            id: "cert-corrected",
            intake_id: baseEvidence.intakeId,
            status: "valid",
            storage_path: currentStoragePath,
            created_at: "2026-06-29T00:02:00Z",
            email_sent_at: null,
            email_failed_at: "2026-06-29T00:03:00Z",
            email_failure_reason: "provider failure",
            resend_count: 0,
            delivery_reconciliation: [
              {
                certificate_storage_version: reconciledStorageVersion,
                recorded_at: "2026-08-14T12:00:00Z",
              },
            ],
          },
        ],
        email_outbox: [],
        certificate_audit_log: [],
      })

    const staleOverview = await getCertificateDeliveryRescueCases(
      buildVersionedStub("00000000000000000000000000000000") as never,
    )
    expect(staleOverview.cases[0]?.recommendation.action).toBe("resend_secure_link")

    const currentOverview = await getCertificateDeliveryRescueCases(
      buildVersionedStub(currentStorageVersion) as never,
    )
    expect(currentOverview.cases[0]?.recommendation.action).toBe("none")
    expect(currentOverview.cases[0]?.recommendation.reason).toContain(
      "Manual delivery was reconciled",
    )
  })

  it("counts queued certificate email delivery as a watch-only warning", async () => {
    const currentStoragePath = "certificates/queued/current.pdf"
    const currentStorageVersion = createHash("sha256")
      .update(currentStoragePath)
      .digest("hex")
      .slice(0, 32)
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
          storage_path: currentStoragePath,
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
          certificate_id: "cert-queued",
          email_type: "med_cert_patient",
          status: "pending",
          delivery_status: null,
          sent_at: null,
          created_at: "2026-06-29T00:03:00Z",
          metadata: { certificate_storage_version: currentStorageVersion },
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

  it("does not let an earlier document-version email suppress rescue for a corrected certificate", async () => {
    const currentStoragePath = "certificates/corrected/version-two.pdf"
    const staleStorageVersion = createHash("sha256")
      .update("certificates/corrected/version-one.pdf")
      .digest("hex")
      .slice(0, 32)
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
          id: "cert-corrected-in-place",
          intake_id: baseEvidence.intakeId,
          status: "valid",
          storage_path: currentStoragePath,
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
          certificate_id: "cert-corrected-in-place",
          email_type: "med_cert_patient",
          status: "sent",
          delivery_status: "delivered",
          sent_at: "2026-06-29T00:03:00Z",
          created_at: "2026-06-29T00:03:00Z",
          metadata: { certificate_storage_version: staleStorageVersion },
        },
      ],
      certificate_audit_log: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases).toHaveLength(1)
    expect(overview.cases[0]?.recommendation).toMatchObject({
      action: "resend_secure_link",
      severity: "critical",
    })
    expect(overview.cases[0]?.certificateEmail.kind).toBe("missing")
  })

  it("keeps the full action total when the rendered case detail is capped", async () => {
    const secondIntakeId = "12345678-1234-4000-8000-000000000002"
    const supabase = createRescueSupabaseStub({
      intakes: [
        {
          id: baseEvidence.intakeId,
          reference_number: "IM-ONE",
          status: "approved",
          document_sent_at: null,
          created_at: "2026-06-29T00:00:00Z",
          updated_at: "2026-06-29T00:04:00Z",
          approved_at: "2026-06-29T00:01:00Z",
          completed_at: null,
        },
        {
          id: secondIntakeId,
          reference_number: "IM-TWO",
          status: "approved",
          document_sent_at: null,
          created_at: "2026-06-29T00:00:00Z",
          updated_at: "2026-06-29T00:03:00Z",
          approved_at: "2026-06-29T00:01:00Z",
          completed_at: null,
        },
      ],
      issued_certificates: [],
      email_outbox: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never, { limit: 1 })

    expect(overview.cases).toHaveLength(1)
    expect(overview.actionCount).toBe(2)
    expect(overview.escalationCount).toBe(2)
  })

  it("keeps old unresolved terminal obligations visible without showing resolved history", async () => {
    const unresolvedIntakeId = "12345678-1234-4000-8000-000000000010"
    const resolvedIntakeId = "12345678-1234-4000-8000-000000000011"
    const resolvedStoragePath = "certificates/resolved/current.pdf"
    const resolvedStorageVersion = createHash("sha256")
      .update(resolvedStoragePath)
      .digest("hex")
      .slice(0, 32)
    const oldCreatedAt = "2025-01-01T00:00:00Z"
    const supabase = createRescueSupabaseStub({
      intakes: [
        {
          id: unresolvedIntakeId,
          reference_number: "IM-OLD-UNRESOLVED",
          status: "approved",
          payment_status: "paid",
          document_sent_at: null,
          created_at: oldCreatedAt,
          updated_at: oldCreatedAt,
          approved_at: oldCreatedAt,
          completed_at: null,
        },
        {
          id: resolvedIntakeId,
          reference_number: "IM-OLD-RESOLVED",
          status: "completed",
          payment_status: "paid",
          document_sent_at: oldCreatedAt,
          created_at: oldCreatedAt,
          updated_at: oldCreatedAt,
          approved_at: oldCreatedAt,
          completed_at: oldCreatedAt,
        },
      ],
      issued_certificates: [
        {
          id: "cert-old-superseded",
          intake_id: unresolvedIntakeId,
          status: "superseded",
          storage_path: "certificates/unresolved/superseded.pdf",
          created_at: oldCreatedAt,
          email_sent_at: oldCreatedAt,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
        },
        {
          id: "cert-old-resolved",
          intake_id: resolvedIntakeId,
          status: "valid",
          storage_path: resolvedStoragePath,
          created_at: oldCreatedAt,
          email_sent_at: oldCreatedAt,
          email_failed_at: null,
          email_failure_reason: null,
          resend_count: 0,
          delivery_reconciliation: [{
            certificate_storage_version: resolvedStorageVersion,
            recorded_at: oldCreatedAt,
          }],
        },
      ],
      email_outbox: [],
      certificate_audit_log: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.cases).toHaveLength(1)
    expect(overview.cases[0]).toMatchObject({
      intakeId: unresolvedIntakeId,
      certificateStatus: "superseded",
      recommendation: { action: "escalate" },
    })
    expect(overview.actionCount).toBe(1)

    const intakeFilters = supabase.filterCalls.filter((call) => call.table === "intakes")
    expect(intakeFilters.some((call) => call.method === "gte" && call.args[0] === "created_at")).toBe(false)
    expect(intakeFilters.some(
      (call) => call.method === "or"
        && String(call.args[0]).includes("status.in.(approved,completed)")
        && String(call.args[0]).includes("payment_status.in.(paid,partially_refunded)"),
    )).toBe(true)
  })

  it("batches certificate, email, and audit evidence IDs below URL-safe limits", async () => {
    const intakeRows = Array.from({ length: 205 }, (_, index) => ({
      id: `intake-${index}`,
      reference_number: `IM-BATCH-${index}`,
      status: "approved",
      payment_status: "paid",
      document_sent_at: null,
      created_at: "2099-01-01T00:00:00Z",
      updated_at: "2099-01-01T00:00:00Z",
      approved_at: "2099-01-01T00:00:00Z",
      completed_at: null,
    }))
    const certificateRows = intakeRows.map((intake, index) => ({
      id: `cert-${index}`,
      intake_id: intake.id,
      status: "valid",
      storage_path: `certificates/batch/${index}.pdf`,
      created_at: "2099-01-01T00:00:00Z",
      email_sent_at: null,
      email_failed_at: null,
      email_failure_reason: null,
      resend_count: 0,
    }))
    const supabase = createRescueSupabaseStub({
      intakes: intakeRows,
      issued_certificates: certificateRows,
      email_outbox: [],
      certificate_audit_log: [],
    })

    const overview = await getCertificateDeliveryRescueCases(supabase as never)

    expect(overview.queryFailed).toBe(false)
    for (const table of ["issued_certificates", "email_outbox", "certificate_audit_log"]) {
      const idFilters = supabase.filterCalls
        .filter((call) => call.table === table && call.method === "in")
        .map((call) => call.args[1] as unknown[])
      expect(idFilters.length).toBeGreaterThan(1)
      expect(Math.max(...idFilters.map((ids) => ids.length))).toBeLessThanOrEqual(100)
    }
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

  it("does not resend a valid certificate whose legacy manual delivery was reconciled", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      certificateId: "cert-reconciled",
      certificateStatus: "valid",
      certificateEmailFailedAt: "2026-06-29T00:03:00Z",
      deliveryReconciledAt: "2026-08-14T12:00:00Z",
    })

    expect(recommendation).toMatchObject({
      action: "none",
      severity: "neutral",
    })
    expect(recommendation.reason).toContain("Manual delivery was reconciled")
  })

  it("escalates a superseded certificate instead of treating an old send as current", () => {
    const recommendation = selectCertificateDeliverySupportAction({
      ...baseEvidence,
      certificateId: "cert-superseded",
      certificateStatus: "superseded",
      certificateEmail: {
        status: "sent",
        deliveryStatus: "delivered",
      },
    })

    expect(recommendation).toMatchObject({
      action: "escalate",
      severity: "critical",
    })
    expect(recommendation.reason).toContain("superseded")
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
