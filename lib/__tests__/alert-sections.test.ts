import { describe, expect, it, vi } from "vitest"

import {
  buildAlertSectionFailureAlert,
  type BusinessAlert,
  runAlertSection,
} from "@/lib/monitoring/alert-sections"

describe("business alert sections", () => {
  it("runs a clean section without recording anything", async () => {
    const alerts: BusinessAlert[] = []
    const onFailure = vi.fn()

    const ok = await runAlertSection({
      section: "failed_payments",
      alerts,
      onFailure,
      run: async () => {
        alerts.push({ metric: "payment_failed", severity: "warning", detail: "3 payment failures" })
      },
    })

    expect(ok).toBe(true)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.metric).toBe("payment_failed")
    expect(onFailure).not.toHaveBeenCalled()
  })

  it("converts a section failure into a critical section-specific alert", async () => {
    const alerts: BusinessAlert[] = []
    const onFailure = vi.fn()

    const ok = await runAlertSection({
      section: "no_purchase_revenue",
      alerts,
      onFailure,
      run: async () => {
        throw new Error("relation partial_intakes does not exist")
      },
    })

    expect(ok).toBe(false)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      metric: "business_alert_section_failed_no_purchase_revenue",
      severity: "critical",
      count: 1,
    })
    expect(alerts[0]?.detail).toContain("no_purchase_revenue")
    expect(alerts[0]?.detail).toContain("relation partial_intakes does not exist")
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(alerts[0], expect.any(Error))
  })

  it("keeps later sections running after an earlier section fails", async () => {
    const alerts: BusinessAlert[] = []
    let laterSectionRan = false

    await runAlertSection({
      section: "first",
      alerts,
      run: async () => {
        throw new Error("boom")
      },
    })
    await runAlertSection({
      section: "second",
      alerts,
      run: async () => {
        laterSectionRan = true
      },
    })

    expect(laterSectionRan).toBe(true)
    expect(alerts.map((a) => a.metric)).toEqual(["business_alert_section_failed_first"])
  })

  it("does not let a broken failure hook take the section runner down", async () => {
    const alerts: BusinessAlert[] = []

    const ok = await runAlertSection({
      section: "ops_invariants",
      alerts,
      onFailure: () => {
        throw new Error("posthog capture exploded")
      },
      run: async () => {
        throw new Error("query failed")
      },
    })

    expect(ok).toBe(false)
    expect(alerts).toHaveLength(1)
  })

  it("builds section failure alerts with per-section metrics for the cooldown", () => {
    const first = buildAlertSectionFailureAlert("stale_human_queue", new Error("a"))
    const second = buildAlertSectionFailureAlert("email_bounced", new Error("b"))

    expect(first.metric).not.toBe(second.metric)
    expect(first.metric).toBe("business_alert_section_failed_stale_human_queue")
    expect(second.metric).toBe("business_alert_section_failed_email_bounced")
  })
})
