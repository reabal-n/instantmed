import { describe, expect, it } from "vitest"

import {
  certOrphanHelper,
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
