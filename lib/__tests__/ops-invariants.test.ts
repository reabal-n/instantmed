import { describe, expect, it } from "vitest"

import {
  buildOperationalInvariantAlerts,
  certOrphanHelper,
  getInvariantQueryFailures,
  invariantTone,
  refundAnomalyHelper,
  SLA_BREACH_CRITICAL,
  slaBacklogHelper,
} from "@/lib/admin/ops-invariants"

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

  it("does not alert on clean invariants", () => {
    expect(buildOperationalInvariantAlerts({
      slaBreachBacklog: 0,
      certRefundOrphans: 0,
      refundRecordAnomalies: 0,
    })).toEqual([])
  })
})
