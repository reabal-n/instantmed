import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildNoPurchaseRevenueAlert,
  NO_PURCHASE_CRITICAL_WINDOW_HOURS,
  NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD,
  NO_PURCHASE_WARNING_WINDOW_HOURS,
} from "@/lib/monitoring/revenue-safety"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("no-purchase revenue safety alert", () => {
  it("does not alert when there is no demand signal", () => {
    expect(
      buildNoPurchaseRevenueAlert({
        windowHours: NO_PURCHASE_WARNING_WINDOW_HOURS,
        paidIntakes: 0,
        createdIntakes: 0,
        checkoutStageIntakes: 0,
        partialDrafts: NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD - 1,
      }),
    ).toBeNull()
  })

  it("does not alert when the paid path is still converting", () => {
    expect(
      buildNoPurchaseRevenueAlert({
        windowHours: NO_PURCHASE_WARNING_WINDOW_HOURS,
        paidIntakes: 1,
        createdIntakes: 3,
        checkoutStageIntakes: 2,
        partialDrafts: 20,
      }),
    ).toBeNull()
  })

  it("warns after 24h with demand and no paid intakes", () => {
    const alert = buildNoPurchaseRevenueAlert({
      windowHours: NO_PURCHASE_WARNING_WINDOW_HOURS,
      paidIntakes: 0,
      createdIntakes: 1,
      checkoutStageIntakes: 1,
      partialDrafts: 3,
    })

    expect(alert?.metric).toBe("no_purchase_window")
    expect(alert?.severity).toBe("warning")
    expect(alert?.metadata).toMatchObject({
      window: "24h",
      paid_intakes: 0,
      created_intakes: 1,
      checkout_stage_intakes: 1,
      partial_drafts: 3,
    })
  })

  it("escalates after 48h with active drafts and no paid intakes", () => {
    const alert = buildNoPurchaseRevenueAlert({
      windowHours: NO_PURCHASE_CRITICAL_WINDOW_HOURS,
      paidIntakes: 0,
      createdIntakes: 0,
      checkoutStageIntakes: 0,
      partialDrafts: NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD,
    })

    expect(alert?.severity).toBe("critical")
    expect(alert?.detail).toContain("No paid intakes in 48h")
  })

  it("keeps the cron, metric, and operations doc wired to the same alert", () => {
    const cron = read("app/api/cron/business-alerts/route.ts")
    const posthog = read("lib/analytics/posthog-server.ts")
    const operations = read("docs/OPERATIONS.md")

    expect(cron).toContain("buildNoPurchaseRevenueAlert")
    expect(cron).toContain("filterReportableIntakes")
    expect(cron).toContain('from("partial_intakes")')
    expect(cron).toContain("NO_PURCHASE_CRITICAL_WINDOW_HOURS")
    expect(cron).toContain("NO_PURCHASE_WARNING_WINDOW_HOURS")
    expect(posthog).toContain("'no_purchase_window'")
    expect(operations).toContain("no-purchase revenue safety")
  })
})
