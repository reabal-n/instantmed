import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApprovedTodayList } from "@/components/doctor/approved-today-list"

describe("ApprovedTodayList", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T02:00:00.000Z"))
  })

  it("labels approvals as actor-scoped and displays the normalized activity timestamp", () => {
    const html = renderToStaticMarkup(
      <ApprovedTodayList
        intakes={[{
          id: "governance-1",
          patient_id: "patient-1",
          status: "approved",
          activity_at: "2026-07-29T01:55:00.000Z",
          activity_provenance: "governance_review",
          patient: { full_name: "Test Patient" },
          service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" },
        }]}
      />,
    )

    expect(html).toContain('aria-label="Your approvals today"')
    expect(html).toContain("Your approvals today")
    expect(html).toContain("5m ago")
    expect(html).not.toContain("Approved today")
  })

  it("labels a truncated approval slice as shown results, not the actor's total", () => {
    const intakes = ["one", "two"].map((id, index) => ({
      id,
      patient_id: `patient-${id}`,
      status: "approved" as const,
      activity_at: new Date(Date.UTC(2026, 6, 29, 1, 55 - index)).toISOString(),
      activity_provenance: "clinician_decision" as const,
      patient: { full_name: `Test Patient ${id}` },
      service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" as const },
    }))
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={intakes} historyTruncated />,
    )

    expect(html).toContain('aria-label="Your latest approvals"')
    expect(html).toContain("Your latest approvals")
    expect(html).toContain("2 shown")
    expect(html).not.toContain("Your approvals today")
  })
})
