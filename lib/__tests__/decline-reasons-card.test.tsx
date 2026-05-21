import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DeclineReasonsCard } from "@/components/admin/decline-reasons-card"
import type { DeclineReasonBreakdown } from "@/lib/data/dashboard-decline-trends"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("DeclineReasonsCard", () => {
  it("self-hides when totalDeclines is zero", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 0,
      topReasons: [],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    expect(html).toBe("")
  })

  it("renders a single reason row", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 4,
      topReasons: [
        {
          code: "controlled_substance",
          label: "Controlled substance request",
          count: 4,
        },
      ],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    expect(html).toContain("Decline reasons")
    expect(html).toContain("Last 30 days")
    expect(html).toContain("4 declined")
    expect(html).toContain("Controlled substance request")
    expect(html).toContain("(100%)")
  })

  it("renders multiple reasons in the provided order", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 10,
      topReasons: [
        { code: "requires_examination", label: "Requires in-person examination", count: 5 },
        { code: "insufficient_info", label: "Insufficient information", count: 3 },
        { code: "controlled_substance", label: "Controlled substance request", count: 2 },
      ],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    const idxA = html.indexOf("Requires in-person examination")
    const idxB = html.indexOf("Insufficient information")
    const idxC = html.indexOf("Controlled substance request")
    expect(idxA).toBeGreaterThan(-1)
    expect(idxB).toBeGreaterThan(idxA)
    expect(idxC).toBeGreaterThan(idxB)
    expect(html).toContain("(50%)")
    expect(html).toContain("(30%)")
    expect(html).toContain("(20%)")
  })

  it("uses no colored backgrounds on routine status (calm-chrome contract)", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 3,
      topReasons: [
        { code: "other", label: "Other reason", count: 3 },
      ],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 1,
      topReasons: [
        { code: "other", label: "Other reason", count: 1 },
      ],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    expect(html).not.toMatch(/brand-coral|\bcoral\b/)
  })

  it("renders an accessible aria-label on the section", () => {
    const breakdown: DeclineReasonBreakdown = {
      windowDays: 30,
      totalDeclines: 1,
      topReasons: [
        { code: "other", label: "Other reason", count: 1 },
      ],
    }
    const html = render(<DeclineReasonsCard breakdown={breakdown} />)
    expect(html).toContain('aria-label="Decline reasons"')
  })
})
