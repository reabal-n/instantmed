import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CaseActionsMenu } from "@/components/operator/cases/case-actions-menu"
import { CaseTable } from "@/components/operator/cases/case-table"
import type { CaseRowData } from "@/lib/operator/cases/types"

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el)
}

const NOW = new Date("2026-05-20T10:00:00+10:00")

const rows: CaseRowData[] = [
  {
    id: "a",
    intakeRef: "IM-A",
    patientName: "Ava Approved",
    avatarInitials: "AA",
    serviceLabel: "Med cert",
    status: "approved",
    createdAt: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
    href: "/admin/intakes/a",
    isRenewal: false,
  },
  {
    id: "b",
    intakeRef: "IM-B",
    patientName: "Ben Declined",
    avatarInitials: "BD",
    serviceLabel: "Repeat Rx",
    status: "declined",
    createdAt: new Date(NOW.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    href: "/admin/intakes/b",
    isRenewal: false,
  },
  {
    id: "c",
    intakeRef: "IM-C",
    patientName: "Cara Pending",
    avatarInitials: "CP",
    serviceLabel: "Consult",
    status: "pending_info",
    createdAt: new Date(NOW.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    href: "/admin/intakes/c",
    isRenewal: false,
  },
]

describe("CaseTable", () => {
  it("renders column headings without enabling sorting", () => {
    const html = render(<CaseTable rows={rows} density="comfortable" />)
    expect(html.match(/role="columnheader"/g)).toHaveLength(4)
    for (const label of ["Patient", "Service", "Status", "Time"]) {
      expect(html).toContain(label)
    }
    expect(html).not.toContain("aria-sort=")
    expect(html).not.toMatch(/<button[^>]*role="columnheader"/)
  })

  it("gives compact action rows space for the 44px menu target", () => {
    const html = render(<CaseTable rows={rows} density="compact" rowActions={(row) => <CaseActionsMenu requestRef={row.intakeRef} actions={[{ label: "Issue refund", onSelect: () => {} }]} />} />)
    const rowTags = html.match(/<div role="row" data-row-id=[^>]+>/g) ?? []
    expect(rowTags).toHaveLength(3)
    for (const tag of rowTags) {
      expect(tag).toContain("min-h-12")
      expect(tag).not.toMatch(/(?: |&quot;)h-10(?: |&quot;)/)
    }
  })

  it("reserves identical non-intrinsic tracks for headings and mixed action rows", () => {
    const html = render(<CaseTable rows={rows} density="comfortable" rowActions={(row) => row.id === "a" ? <CaseActionsMenu requestRef={row.intakeRef} actions={[{ label: "Issue refund", onSelect: () => {} }]} /> : null} />)
    const tracks = html.match(/grid-cols-\[[^\]]+\]/g) ?? []
    expect(tracks).toHaveLength(4)
    expect(new Set(tracks).size).toBe(1)
    expect(tracks[0]).not.toContain("auto")
    expect(tracks[0]).toContain("_90px_100px]")
  })

  it("renders all rows", () => {
    const html = render(<CaseTable rows={rows} density="comfortable" />)
    expect(html).toContain("Ava Approved")
    expect(html).toContain("Ben Declined")
    expect(html).toContain("Cara Pending")
  })

  it("renders time-group headers when groupByTime is true", () => {
    const html = render(
      <CaseTable rows={rows} density="comfortable" groupByTime now={NOW} />,
    )
    expect(html).toContain("TODAY")
    expect(html).toContain("YESTERDAY")
    expect(html).toContain("THIS WEEK")
  })

  it("does NOT render time-group headers when groupByTime is false", () => {
    const html = render(<CaseTable rows={rows} density="comfortable" />)
    expect(html).not.toContain("TODAY")
    expect(html).not.toContain("YESTERDAY")
  })

  it("renders sortable column headers when sortable is true", () => {
    const html = render(
      <CaseTable
        rows={rows}
        density="comfortable"
        sortable
        sortState={{ field: "createdAt", direction: "desc" }}
      />,
    )
    expect(html).toContain("Patient")
    expect(html).toContain("Service")
    expect(html).toContain("Status")
    expect(html).toContain("Time")
  })

  it("emits aria-sort on the active column", () => {
    const html = render(
      <CaseTable
        rows={rows}
        density="comfortable"
        sortable
        sortState={{ field: "createdAt", direction: "desc" }}
      />,
    )
    expect(html).toMatch(/aria-sort="descending"/)
  })

  it("emits role=grid for table semantics", () => {
    const html = render(<CaseTable rows={rows} density="comfortable" />)
    expect(html).toContain('role="grid"')
  })

  it("renders the provided empty state when rows is empty", () => {
    const html = render(
      <CaseTable
        rows={[]}
        density="comfortable"
        emptyState={{ title: "All caught up", body: "Nothing in the queue." }}
      />,
    )
    expect(html).toContain("All caught up")
    expect(html).toContain("Nothing in the queue.")
  })

  it("does not crash when rows is empty and no empty state is given", () => {
    const html = render(<CaseTable rows={[]} density="comfortable" />)
    expect(html.length).toBeGreaterThan(0)
  })

  it("threads density to its rows", () => {
    const html = render(<CaseTable rows={rows} density="compact" />)
    expect(html).toContain("h-10")
  })

  it("passes rowActions through to each row", () => {
    const html = render(
      <CaseTable
        rows={rows}
        density="comfortable"
        rowActions={() => (
          <button type="button" data-testid="row-action">
            Open
          </button>
        )}
      />,
    )
    // 3 rows, 3 action buttons
    const matches = html.match(/data-testid="row-action"/g) ?? []
    expect(matches.length).toBe(3)
    expect(html).not.toContain("opacity-0")
  })
})
