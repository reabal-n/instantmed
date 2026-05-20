import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StatusDot } from "@/components/operator/cases/status-dot"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("StatusDot", () => {
  it("renders the status label by default", () => {
    const html = render(<StatusDot status="approved" />)
    expect(html).toContain("Approved")
  })

  it("visually hides the label when hideLabel is set, keeps it for screen readers", () => {
    const html = render(<StatusDot status="approved" hideLabel />)
    expect(html).toContain('class="sr-only"')
    expect(html).toContain("Approved")
    expect(html).toContain('data-status-dot="approved"')
  })

  it("uses emerald for approved", () => {
    expect(render(<StatusDot status="approved" />)).toContain("bg-emerald-500")
  })

  it("uses red for declined", () => {
    expect(render(<StatusDot status="declined" />)).toContain("bg-red-500")
  })

  it("uses blue for in_review (system primary tone)", () => {
    expect(render(<StatusDot status="in_review" />)).toContain("bg-blue-500")
  })

  it("uses violet for awaiting_script", () => {
    expect(render(<StatusDot status="awaiting_script" />)).toContain("bg-violet-500")
  })

  it("uses amber for pending_info", () => {
    expect(render(<StatusDot status="pending_info" />)).toContain("bg-amber-500")
  })

  it("renders the dot at 8px (h-2 w-2)", () => {
    const html = render(<StatusDot status="approved" />)
    expect(html).toContain("h-2 w-2")
  })

  it("falls back to slate for unknown status", () => {
    const html = render(
      <StatusDot status={"mystery" as unknown as "approved"} />,
    )
    expect(html).toContain("bg-slate-400")
  })

  it("never uses coral (brand reserved)", () => {
    const statuses = [
      "approved", "declined", "in_review", "awaiting_script",
      "pending_info", "draft", "completed", "expired", "refunded",
    ] as const
    for (const status of statuses) {
      const html = render(<StatusDot status={status} />)
      expect(html).not.toMatch(/brand-coral|coral/)
    }
  })
})
