import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GeographicBreakdownCard } from "@/components/admin/geographic-breakdown-card"
import type { GeographicBreakdown } from "@/lib/data/analytics-geographic"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("GeographicBreakdownCard", () => {
  it("self-hides when totalPatients is zero", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 0,
      topStates: [],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).toBe("")
  })

  it("renders a single state row with header copy", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 5,
      topStates: [{ state: "NSW", count: 5, share: 1 }],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).toContain("Patients by state")
    expect(html).toContain("Last 30 days")
    expect(html).toContain("5 unique")
    expect(html).toContain("NSW")
    expect(html).toContain("(100%)")
  })

  it("renders multiple states in the provided order", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 10,
      topStates: [
        { state: "NSW", count: 5, share: 0.5 },
        { state: "VIC", count: 3, share: 0.3 },
        { state: "QLD", count: 2, share: 0.2 },
      ],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    const idxNsw = html.indexOf("NSW")
    const idxVic = html.indexOf("VIC")
    const idxQld = html.indexOf("QLD")
    expect(idxNsw).toBeGreaterThan(-1)
    expect(idxVic).toBeGreaterThan(idxNsw)
    expect(idxQld).toBeGreaterThan(idxVic)
    expect(html).toContain("(50%)")
    expect(html).toContain("(30%)")
    expect(html).toContain("(20%)")
  })

  it("shows the unknown row when there are patients with no state on file", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 4,
      topStates: [{ state: "NSW", count: 3, share: 0.75 }],
      unknownCount: 1,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).toContain("No state on file")
  })

  it("hides the unknown row when unknownCount is zero", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 3,
      topStates: [{ state: "NSW", count: 3, share: 1 }],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).not.toContain("No state on file")
  })

  it("uses no tinted backdrops on routine status (calm-chrome contract)", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 5,
      topStates: [
        { state: "NSW", count: 3, share: 0.6 },
        { state: "VIC", count: 2, share: 0.4 },
      ],
      unknownCount: 1,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 2,
      topStates: [{ state: "NSW", count: 2, share: 1 }],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).not.toMatch(/brand-coral|\bcoral\b/)
  })

  it("renders an accessible aria-label on the section", () => {
    const breakdown: GeographicBreakdown = {
      windowDays: 30,
      totalPatients: 1,
      topStates: [{ state: "NSW", count: 1, share: 1 }],
      unknownCount: 0,
    }
    const html = render(<GeographicBreakdownCard breakdown={breakdown} />)
    expect(html).toContain('aria-label="Patients by state"')
  })
})
