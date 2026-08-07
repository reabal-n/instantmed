import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApprovedTodayList } from "@/components/doctor/approved-today-list"

const clinicianRow = {
  id: "decision-1",
  patient_id: "patient-1",
  status: "approved" as const,
  activity_at: "2026-07-29T01:55:00.000Z",
  activity_provenance: "clinician_decision" as const,
  flagged: false,
  patient: { full_name: "Test Patient" },
  service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" as const },
}

const autoIssuedRow = {
  id: "auto-1",
  patient_id: "patient-2",
  status: "approved" as const,
  activity_at: "2026-07-29T01:50:00.000Z",
  activity_provenance: "auto_issued" as const,
  flagged: false,
  patient: { full_name: "Auto Patient" },
  service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" as const },
}

describe("ApprovedTodayList", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T02:00:00.000Z"))
  })

  it("renders the day's approvals with the decision timestamp", () => {
    const html = renderToStaticMarkup(<ApprovedTodayList intakes={[clinicianRow]} />)

    expect(html).toContain('aria-label="Approved today"')
    expect(html).toContain("Approved today")
    expect(html).toContain("Test Patient")
    expect(html).toContain("5m ago")
  })

  it("labels auto-issued certificates so they never read as the clinician's own decision", () => {
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={[clinicianRow, autoIssuedRow]} />,
    )

    expect(html).toContain("Auto-issued")
    expect(html).toContain("Auto Patient")
    // The split is explicit: protocol issuances are never absorbed into "yours".
    expect(html).toContain("1 yours · 1 auto-issued")
  })

  // The auto-approval engine records info-severity soft flags (co-symptom
  // mental-health / injury / chronic mentions, AI-draft review hints) on
  // certificates it still issues. Its own comments assume a human sees them
  // afterwards; with the 24h attestation gone, this marker is what makes that
  // true. It marks, it does not nag.
  it("marks auto-issued certificates the engine flagged", () => {
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={[{ ...autoIssuedRow, flagged: true }]} />,
    )

    expect(html).toContain("Flagged")
  })

  it("does not mark unflagged rows", () => {
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={[clinicianRow, autoIssuedRow]} />,
    )

    expect(html).not.toContain("Flagged")
  })

  it("omits the provenance split when nothing was auto-issued", () => {
    const html = renderToStaticMarkup(<ApprovedTodayList intakes={[clinicianRow]} />)

    expect(html).not.toContain("auto-issued")
    expect(html).not.toContain("Auto-issued")
  })

  it("renders no attestation, deadline, or governance-window affordance", () => {
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={[clinicianRow, autoIssuedRow]} />,
    )

    // The post-approval attestation obligation was removed 2026-08-04. This
    // surface is a spot-check only; nothing here may nag or require clearing.
    expect(html).not.toContain("Attest")
    expect(html).not.toContain("governance window")
    expect(html).not.toContain("awaiting")
    expect(html).not.toContain("overdue")
  })

  it("labels a truncated approval slice as shown results, not the actor's total", () => {
    const intakes = ["one", "two"].map((id, index) => ({
      ...clinicianRow,
      id,
      patient_id: `patient-${id}`,
      activity_at: new Date(Date.UTC(2026, 6, 29, 1, 55 - index)).toISOString(),
      patient: { full_name: `Test Patient ${id}` },
    }))
    const html = renderToStaticMarkup(
      <ApprovedTodayList intakes={intakes} historyTruncated />,
    )

    expect(html).toContain('aria-label="Latest approvals"')
    expect(html).toContain("Latest approvals")
    expect(html).toContain("2 shown")
  })
})
