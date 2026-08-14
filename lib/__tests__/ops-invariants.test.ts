import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildOperationalInvariantAlerts,
  CERTIFICATE_MISSING_RECORD_DAYS,
  CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS,
  getInvariantQueryFailures,
} from "@/lib/admin/ops-invariants"

const opsInvariantsSource = readFileSync(
  join(process.cwd(), "lib/admin/ops-invariants.ts"),
  "utf8",
)

describe("buildOperationalInvariantAlerts", () => {
  it("turns non-zero ops invariants into PHI-free warning and critical alerts", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: 10,
      certRefundOrphans: 2,
      refundRecordAnomalies: 1,
    })

    expect(alerts).toEqual([
      {
        metric: "ops_sla_breach_backlog",
        severity: "critical",
        detail: "10 paid intakes past 24h review SLA",
        count: 10,
      },
      {
        metric: "ops_cert_refund_orphans",
        severity: "critical",
        detail: "2 refunded certificate intakes still verify as valid",
        count: 2,
      },
      {
        metric: "ops_refund_record_anomalies",
        severity: "warning",
        detail: "1 refunded intake missing complete refund metadata",
        count: 1,
      },
    ])

    expect(JSON.stringify(alerts)).not.toMatch(/patient|email|medicare|phone|address|intakeId/i)
  })

  it("keeps a non-zero SLA backlog below ten at warning severity", () => {
    expect(buildOperationalInvariantAlerts({
      slaBreachBacklog: 9,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
    })).toEqual([{
      metric: "ops_sla_breach_backlog",
      severity: "warning",
      detail: "9 paid intakes past 24h review SLA",
      count: 9,
    }])
  })

  it("turns invariant query failures into PHI-free critical alerts instead of zero-count silence", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      queryFailures: ["sla_breach_backlog", "refund_record_anomalies"],
    })

    expect(alerts).toEqual([
      {
        metric: "ops_invariant_query_failed",
        severity: "critical",
        detail: "2 operational invariant queries failed",
        count: 2,
      },
    ])
    expect(JSON.stringify(alerts)).not.toMatch(/patient|email|medicare|phone|address|intakeId/i)
  })

  it("reports failed invariant query names without patient identifiers", () => {
    expect(getInvariantQueryFailures({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      queryFailures: ["cert_refund_orphans"],
    })).toEqual(["cert_refund_orphans"])
  })

  it("raises a PHI-free critical alert for paid-but-cancelled (charged, undelivered) intakes", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      paidButCancelled: 1,
    })
    expect(alerts).toEqual([
      {
        metric: "ops_paid_but_cancelled",
        severity: "critical",
        detail: "1 paid intake cancelled without refund (charged, undelivered)",
        count: 1,
      },
    ])
    expect(JSON.stringify(alerts)).not.toMatch(/patient|email|medicare|phone|address|intakeId/i)
  })

  it("raises a PHI-free warning when recent certificate sent emails lack document_sent_at", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      paidButCancelled: 0,
      certificateSentMissingTimestamp: 3,
    })

    expect(alerts).toEqual([
      {
        metric: "ops_certificate_sent_missing_timestamp",
        severity: "warning",
        detail: "3 recent certificate sends are missing document_sent_at",
        count: 3,
      },
    ])
    expect(JSON.stringify(alerts)).not.toMatch(/patient|email|medicare|phone|address|intakeId/i)
  })

  it("raises a PHI-free critical alert when an approved certificate intake has no certificate record", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      paidButCancelled: 0,
      approvedCertificateMissingRecord: 2,
      certificateSentMissingTimestamp: 0,
    })

    expect(alerts).toEqual([
      {
        metric: "ops_approved_certificate_missing_record",
        severity: "critical",
        detail: "2 approved medical certificate intakes are missing a certificate record",
        count: 2,
      },
    ])
    expect(JSON.stringify(alerts)).not.toMatch(/patient|email|medicare|phone|address|intakeId/i)
  })

  it("does not alert on clean invariants (incl. absent paidButCancelled)", () => {
    expect(buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
      paidButCancelled: 0,
      approvedCertificateMissingRecord: 0,
      certificateSentMissingTimestamp: 0,
    })).toEqual([])
  })
})

describe("approved certificate missing record monitor contract", () => {
  it("counts recent terminal paid med-cert intakes without an issued certificate row", () => {
    expect(CERTIFICATE_MISSING_RECORD_DAYS).toBe(14)
    expect(opsInvariantsSource).toContain("countApprovedCertificateMissingRecord")
    expect(opsInvariantsSource).toContain('.from("intakes")')
    expect(opsInvariantsSource).toContain('.eq("category", "medical_certificate")')
    expect(opsInvariantsSource).toContain('.eq("payment_status", "paid")')
    expect(opsInvariantsSource).toContain('.in("status", ["approved", "completed"])')
    expect(opsInvariantsSource).toContain('.gte("approved_at", sinceIso)')
    expect(opsInvariantsSource).toContain('.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")')
    expect(opsInvariantsSource).toContain('.from("issued_certificates")')
    expect(opsInvariantsSource).toContain('.select("intake_id")')
    expect(opsInvariantsSource).toContain("!generatedIntakeIds.has(id)")
    expect(opsInvariantsSource).toContain("ops_approved_certificate_missing_record")
  })
})

describe("paid-but-cancelled monitor contract", () => {
  it("counts paid cancelled intakes that still remain in reporting", () => {
    expect(opsInvariantsSource).toContain("paidCancelledResult")
    expect(opsInvariantsSource).toContain('.eq("payment_status", "paid")')
    expect(opsInvariantsSource).toContain('.eq("status", "cancelled")')
    expect(opsInvariantsSource).toContain('.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")')
    expect(opsInvariantsSource).toContain('paidButCancelled: countOf("paid_but_cancelled", paidCancelledResult, queryFailures)')
    expect(opsInvariantsSource).toContain("ops_paid_but_cancelled")
  })
})

describe("certificate sent timestamp drift monitor contract", () => {
  it("uses a 14-day sent med-cert email signal and only counts intakes missing document_sent_at", () => {
    expect(CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS).toBe(14)
    expect(opsInvariantsSource).toContain('.from("email_outbox")')
    expect(opsInvariantsSource).toContain('.eq("email_type", "med_cert_patient")')
    expect(opsInvariantsSource).toContain('.eq("status", "sent")')
    expect(opsInvariantsSource).toContain('.gte("created_at", sinceIso)')
    expect(opsInvariantsSource).toContain('.not("certificate_id", "is", null)')
    expect(opsInvariantsSource).toContain("certificate_storage_version")
    expect(opsInvariantsSource).toContain("getEmployerCertificateStorageVersion")
    expect(opsInvariantsSource).toContain("filterSeededE2EIntakes")
    expect(opsInvariantsSource).toContain('.eq("category", "medical_certificate")')
    expect(opsInvariantsSource).toContain('.is("document_sent_at", null)')
    expect(opsInvariantsSource).toContain('.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")')
  })
})
