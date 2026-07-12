import { describe, expect, it } from "vitest"

import {
  buildOperatorBrief,
  type OperatorBriefInput,
} from "@/lib/admin/operator-brief"

describe("operator brief", () => {
  it("withholds milestone conclusions when canonical revenue is unavailable", () => {
    const brief = buildOperatorBrief({
      revenue: { availability: "unavailable" },
      queue: { availability: "unavailable" },
      recovery: { availability: "unavailable" },
      ads: { availability: "unavailable" },
    })

    expect(brief.milestone).toBeNull()
    expect(brief.milestoneAvailability).toBe("unavailable")
  })

  it("reports no exceptions only when every aggregate source is available and clear", () => {
    const brief = buildOperatorBrief({
      revenue: {
        availability: "available",
        value: { rolling30DayNetCents: 130_000 },
      },
      queue: {
        availability: "available",
        value: { waitingCount: 1, oldestWaitingMinutes: 30 },
      },
      recovery: {
        availability: "available",
        value: { criticalIssueCount: 0, warningIssueCount: 0 },
      },
      ads: {
        availability: "available",
        value: {
          configurationSeverity: "ok",
          failedUploads: 0,
          missingUploads: 0,
          queryErrorCount: 0,
        },
      },
    })

    expect(brief.milestone?.activeMilestone.key).toBe("two_thousand")
    expect(brief.exceptions).toEqual({
      status: "clear",
      summaryLabel: "No exceptions from available sources",
      items: [],
      sourceAvailability: {
        queue: "available",
        recovery: "available",
        ads: "available",
      },
    })
  })

  it("distinguishes unavailable and degraded aggregate sources from a clear state", () => {
    const brief = buildOperatorBrief({
      revenue: {
        availability: "available",
        value: { rolling30DayNetCents: 130_000 },
      },
      queue: { availability: "unavailable" },
      recovery: {
        availability: "degraded",
        value: { criticalIssueCount: 0, warningIssueCount: 0 },
      },
      ads: {
        availability: "available",
        value: {
          configurationSeverity: "ok",
          failedUploads: 0,
          missingUploads: 0,
          queryErrorCount: 0,
        },
      },
    })

    expect(brief.exceptions.status).toBe("attention")
    expect(brief.exceptions.summaryLabel).toBe("2 source checks need attention")
    expect(brief.exceptions.sourceAvailability).toEqual({
      queue: "unavailable",
      recovery: "degraded",
      ads: "available",
    })
    expect(brief.exceptions.items).toEqual([
      {
        id: "queue_source_unavailable",
        source: "queue",
        severity: "warning",
        availability: "unavailable",
        title: "Queue data unavailable",
        detail: "Queue checks did not return. Open the clinical queue to verify it directly.",
        href: "/dashboard?status=review#doctor-queue",
      },
      {
        id: "recovery_source_degraded",
        source: "recovery",
        severity: "warning",
        availability: "degraded",
        title: "Recovery data degraded",
        detail: "Some recovery checks did not return. Open operations to verify the remaining checks.",
        href: "/admin/ops",
      },
    ])
  })

  it("emits at most three severity-ranked actions from aggregate queue, recovery, and Ads state", () => {
    const brief = buildOperatorBrief({
      revenue: {
        availability: "available",
        value: { rolling30DayNetCents: 130_000 },
      },
      queue: {
        availability: "available",
        value: { waitingCount: 4, oldestWaitingMinutes: 300 },
      },
      recovery: {
        availability: "available",
        value: { criticalIssueCount: 2, warningIssueCount: 4 },
      },
      ads: {
        availability: "available",
        value: {
          configurationSeverity: "warning",
          failedUploads: 0,
          missingUploads: 3,
          queryErrorCount: 1,
        },
      },
    })

    expect(brief.exceptions.status).toBe("critical")
    expect(brief.exceptions.summaryLabel).toBe("3 exceptions need attention")
    expect(brief.exceptions.items).toHaveLength(3)
    expect(brief.exceptions.items.map((item) => [item.id, item.severity])).toEqual([
      ["queue_wait_critical", "critical"],
      ["recovery_issues_critical", "critical"],
      ["ads_health_warning", "warning"],
    ])
    expect(brief.exceptions.items).toMatchObject([
      {
        source: "queue",
        title: "Queue wait above 4 hours",
        detail: "4 requests waiting · oldest 5h",
        href: "/dashboard?status=review#doctor-queue",
      },
      {
        source: "recovery",
        title: "Recovery work needs attention",
        detail: "2 critical · 4 warning",
        href: "/admin/ops",
      },
      {
        source: "ads",
        title: "Google Ads needs attention",
        detail: "Configuration warning · 3 missing uploads · 1 report error",
        href: "/admin/analytics#paid-ads-heading",
      },
    ])
  })

  it("never echoes unexpected patient, inbox, or search-term payloads", () => {
    const input = {
      revenue: {
        availability: "available",
        value: { rolling30DayNetCents: 130_000 },
      },
      queue: {
        availability: "available",
        value: {
          waitingCount: 1,
          oldestWaitingMinutes: 30,
          patientName: "Private Patient",
        },
      },
      recovery: {
        availability: "available",
        value: {
          criticalIssueCount: 0,
          warningIssueCount: 1,
          emailText: "Sensitive support message",
        },
      },
      ads: {
        availability: "available",
        value: {
          configurationSeverity: "ok",
          failedUploads: 0,
          missingUploads: 0,
          queryErrorCount: 0,
          rawSearchTerm: "Sensitive health search",
        },
      },
    } as unknown as OperatorBriefInput

    const serialized = JSON.stringify(buildOperatorBrief(input))
    expect(serialized).not.toContain("Private Patient")
    expect(serialized).not.toContain("Sensitive support message")
    expect(serialized).not.toContain("Sensitive health search")
  })
})
