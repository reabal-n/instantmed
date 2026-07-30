import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CaseMobileList } from "@/components/operator/cases/case-mobile-list"
import type { CaseRowData } from "@/lib/operator/cases/types"

const NOW = new Date("2026-07-30T10:00:00+10:00")

const rows: CaseRowData[] = [
  {
    id: "request-a",
    intakeRef: "IM-REQUEST-A",
    patientName: "A. P.",
    avatarInitials: "AP",
    serviceLabel: "Repeat prescription",
    status: "checkout_failed",
    createdAt: new Date(NOW.getTime() - 20 * 60 * 1000).toISOString(),
    href: "/admin/intakes/request-a",
    isRenewal: false,
  },
]

describe("CaseMobileList", () => {
  it("renders the essential case summary without a horizontal table", () => {
    const html = renderToStaticMarkup(
      <CaseMobileList rows={rows} groupByTime now={NOW} />,
    )

    expect(html).toContain('data-case-mobile-list="true"')
    expect(html).toContain('data-mobile-case-row="true"')
    expect(html).toContain("A. P.")
    expect(html).toContain("IM-REQUEST-A")
    expect(html).toContain("Repeat prescription")
    expect(html).toContain("Checkout Failed")
    expect(html).toContain("20m ago")
    expect(html).not.toContain("min-w-[760px]")
  })

  it("keeps labelled recovery actions visible without hover", () => {
    const html = renderToStaticMarkup(
      <CaseMobileList
        rows={rows}
        rowActions={() => (
          <button type="button">Copy payment reply</button>
        )}
      />,
    )

    expect(html).toContain('data-mobile-row-actions="always-visible"')
    expect(html).toContain("Copy payment reply")
    expect(html).toContain("min-h-11")
    expect(html).not.toContain("opacity-0")
    expect(html).not.toContain("group-hover:opacity-100")
  })

  it("preserves the admin row destination and accessible open label", () => {
    const html = renderToStaticMarkup(<CaseMobileList rows={rows} />)

    expect(html).toContain('href="/admin/intakes/request-a"')
    expect(html).toContain('aria-label="Open case IM-REQUEST-A for A. P."')
  })
})
