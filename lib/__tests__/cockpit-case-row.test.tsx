import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CaseRow } from "@/components/operator/cases/case-row"
import type { CaseRowData } from "@/lib/operator/cases/types"

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el)
}

const baseRow: CaseRowData = {
  id: "intake-1",
  intakeRef: "IM-20260520-C65F68",
  patientName: "Ketzia Faisey",
  patientEmail: "k.bon5308@gmail.com",
  avatarInitials: "KF",
  serviceLabel: "Medical certificate",
  status: "approved",
  createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  href: "/admin/intakes/intake-1",
  isRenewal: false,
}

describe("CaseRow", () => {
  it("renders patient name, email, ref, service, and status", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).toContain("Ketzia Faisey")
    expect(html).toContain("k.bon5308@gmail.com")
    expect(html).toContain("IM-20260520-C65F68")
    expect(html).toContain("Medical certificate")
    expect(html).toContain("Approved")
  })

  it("renders the intake ref in font-mono with tabular-nums", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).toMatch(/font-mono[^"]*tabular-nums/)
  })

  it("renders an accessible link to the case detail (no nested interactives)", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    // The row exposes ONE link to the case, no nested buttons inside it.
    const linkMatches = html.match(/<a [^>]*href="[^"]*"/g) ?? []
    expect(linkMatches.length).toBe(1)
    expect(html).toContain('href="/admin/intakes/intake-1"')
    // The link must be standalone, not wrapping a button.
    expect(html).not.toMatch(/<a [^>]*>\s*<button/)
  })

  it("emits role=row for table semantics", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).toContain('role="row"')
  })

  it("flags priority review with an accessible label", () => {
    const html = render(
      <CaseRow row={{ ...baseRow, isPriority: true }} density="comfortable" />,
    )
    expect(html).toContain("Priority review")
  })

  it("flags stale > 4h with an accessible label", () => {
    const html = render(
      <CaseRow row={{ ...baseRow, isStale: true }} density="comfortable" />,
    )
    expect(html).toContain("Stale")
  })

  it("renders the Renewal chip when isRenewal is true", () => {
    const html = render(
      <CaseRow row={{ ...baseRow, isRenewal: true }} density="comfortable" />,
    )
    expect(html).toContain("Renewal")
    expect(html).toContain("Renewal: patient already has this prescription on file")
  })

  it("hides the Renewal chip when isRenewal is false", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).not.toContain("Renewal")
  })

  it("shows retryable failed checkout as payment recovery work", () => {
    const html = render(
      <CaseRow
        row={{
          ...baseRow,
          status: "checkout_failed",
          paymentRecoveryIndicator: "payment_retry",
        }}
        density="comfortable"
      />,
    )

    expect(html).toContain("Retry payment")
    expect(html).toContain("Unpaid checkout failed")
  })

  it("shows paid cancelled rows as reconciliation work instead of retry work", () => {
    const html = render(
      <CaseRow
        row={{
          ...baseRow,
          status: "cancelled",
          paymentStatus: "paid",
          paymentRecoveryIndicator: "paid_cancelled",
        }}
        density="comfortable"
      />,
    )

    expect(html).toContain("Paid + cancelled")
    expect(html).toContain("Charged but cancelled")
    expect(html).not.toContain("Retry payment")
  })

  it("applies compact row height", () => {
    const html = render(<CaseRow row={baseRow} density="compact" />)
    expect(html).toContain("h-10")
  })

  it("applies comfortable row height by default", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).toContain("h-14")
  })

  it("applies spacious row height", () => {
    const html = render(<CaseRow row={baseRow} density="spacious" />)
    expect(html).toContain("h-[72px]")
  })

  it("renders action buttons as siblings of the link, never inside", () => {
    const action = (
      <button data-testid="approve" type="button">
        Approve
      </button>
    )
    const html = render(
      <CaseRow row={baseRow} density="comfortable" actions={action} />,
    )
    expect(html).toContain("Approve")
    // Extract every <a>...</a> block and assert no <button> nests inside.
    const linkBlocks = html.match(/<a [^>]*>(?:(?!<\/a>)[\s\S])*?<\/a>/g) ?? []
    for (const block of linkBlocks) {
      expect(block).not.toContain("<button")
    }
  })

  it("uses only transition-colors for motion (portal rule)", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    // No spring, no transform, no scale animations inside the row.
    expect(html).not.toMatch(/transition-transform|transition-all|animate-/)
  })

  it("uses tabular-nums on the time column", () => {
    const html = render(<CaseRow row={baseRow} density="comfortable" />)
    expect(html).toMatch(/tabular-nums/)
  })

  it("renders selected state when selected prop is true", () => {
    const html = render(
      <CaseRow row={baseRow} density="comfortable" selected />,
    )
    expect(html).toContain("data-selected=\"true\"")
  })

  it("still renders a navigable href when onPrimary is set (modifier-click fallback)", () => {
    const html = render(
      <CaseRow
        row={baseRow}
        density="comfortable"
        onPrimary={() => undefined}
      />,
    )
    // Cmd/Ctrl/middle-click should still follow the link to /admin/intakes/...
    expect(html).toContain('href="/admin/intakes/intake-1"')
  })
})
