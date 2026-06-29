import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  approvedCertificateMissingRecordHelper,
  buildOperationalInvariantAlerts,
  CERTIFICATE_MISSING_RECORD_DAYS,
  CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS,
  certificateSentMissingTimestampHelper,
  certOrphanHelper,
  getInvariantQueryFailures,
  invariantTone,
  paidButCancelledHelper,
  refundAnomalyHelper,
  SLA_BREACH_CRITICAL,
  slaBacklogHelper,
} from "@/lib/admin/ops-invariants"

const opsInvariantsSource = readFileSync(
  join(process.cwd(), "lib/admin/ops-invariants.ts"),
  "utf8",
)

describe("invariantTone", () => {
  it("is neutral at zero regardless of threshold", () => {
    expect(invariantTone(0, 1)).toBe("neutral")
    expect(invariantTone(0, SLA_BREACH_CRITICAL)).toBe("neutral")
    expect(invariantTone(0, Number.POSITIVE_INFINITY)).toBe("neutral")
  })

  it("is critical at or above the criticalAt threshold", () => {
    // Orphans use criticalAt=1: any orphan is a medico-legal exposure.
    expect(invariantTone(1, 1)).toBe("critical")
    expect(invariantTone(2, 1)).toBe("critical")
    // SLA backlog uses criticalAt=SLA_BREACH_CRITICAL.
    expect(invariantTone(SLA_BREACH_CRITICAL, SLA_BREACH_CRITICAL)).toBe("critical")
    expect(invariantTone(SLA_BREACH_CRITICAL + 5, SLA_BREACH_CRITICAL)).toBe("critical")
  })

  it("is warning between 1 and the threshold (exclusive)", () => {
    expect(invariantTone(1, SLA_BREACH_CRITICAL)).toBe("warning")
    expect(invariantTone(SLA_BREACH_CRITICAL - 1, SLA_BREACH_CRITICAL)).toBe("warning")
    // Anomalies pass Infinity so they never escalate past warning.
    expect(invariantTone(1, Number.POSITIVE_INFINITY)).toBe("warning")
    expect(invariantTone(99, Number.POSITIVE_INFINITY)).toBe("warning")
  })

  it("treats negative counts as neutral (defensive)", () => {
    expect(invariantTone(-1, 1)).toBe("neutral")
  })
})

describe("helper text builders", () => {
  it("slaBacklogHelper", () => {
    expect(slaBacklogHelper(0)).toBe("Within 24h SLA")
    expect(slaBacklogHelper(1)).toBe("1 past 24h")
    expect(slaBacklogHelper(7)).toBe("7 past 24h")
  })

  it("certOrphanHelper", () => {
    expect(certOrphanHelper(0)).toBe("None")
    expect(certOrphanHelper(2)).toBe("2 need revoke decision")
  })

  it("refundAnomalyHelper", () => {
    expect(refundAnomalyHelper(0)).toBe("None")
    expect(refundAnomalyHelper(1)).toBe("1 to reconcile")
  })

  it("paidButCancelledHelper", () => {
    expect(paidButCancelledHelper(0)).toBe("None")
    expect(paidButCancelledHelper(1)).toBe("1 charged, undelivered")
  })

  it("certificateSentMissingTimestampHelper", () => {
    expect(certificateSentMissingTimestampHelper(0)).toBe("All mirrored")
    expect(certificateSentMissingTimestampHelper(1)).toBe("1 missing sent timestamp")
    expect(certificateSentMissingTimestampHelper(3)).toBe("3 missing sent timestamps")
  })

  it("approvedCertificateMissingRecordHelper", () => {
    expect(approvedCertificateMissingRecordHelper(0)).toBe("All generated")
    expect(approvedCertificateMissingRecordHelper(2)).toBe("2 need escalation")
  })
})

describe("buildOperationalInvariantAlerts", () => {
  it("turns non-zero ops invariants into PHI-free warning and critical alerts", () => {
    const alerts = buildOperationalInvariantAlerts({
      slaBreachBacklog: SLA_BREACH_CRITICAL,
      certRefundOrphans: 2,
      refundRecordAnomalies: 1,
    })

    expect(alerts).toEqual([
      {
        metric: "ops_sla_breach_backlog",
        severity: "critical",
        detail: `${SLA_BREACH_CRITICAL} paid intakes past 24h review SLA`,
        count: SLA_BREACH_CRITICAL,
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

describe("certificate sent timestamp drift monitor contract", () => {
  it("uses a 14-day sent med-cert email signal and only counts intakes missing document_sent_at", () => {
    expect(CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS).toBe(14)
    expect(opsInvariantsSource).toContain('.from("email_outbox")')
    expect(opsInvariantsSource).toContain('.eq("email_type", "med_cert_patient")')
    expect(opsInvariantsSource).toContain('.eq("status", "sent")')
    expect(opsInvariantsSource).toContain('.gte("created_at", sinceIso)')
    expect(opsInvariantsSource).toContain("filterSeededE2EIntakes")
    expect(opsInvariantsSource).toContain('.eq("category", "medical_certificate")')
    expect(opsInvariantsSource).toContain('.is("document_sent_at", null)')
    expect(opsInvariantsSource).toContain('.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")')
  })
})
