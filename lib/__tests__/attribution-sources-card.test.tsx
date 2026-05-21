import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AttributionSourcesCard } from "@/components/admin/attribution-sources-card"
import type { AttributionSourceBreakdown } from "@/lib/data/dashboard-attribution"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("AttributionSourcesCard", () => {
  it("self-hides when totalIntakes is zero", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 0,
      topSources: [],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    expect(html).toBe("")
  })

  it("renders a single source row", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 5,
      topSources: [
        { group: "google_ads", label: "Google Ads", count: 5, share: 1 },
      ],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    expect(html).toContain("Where patients came from")
    expect(html).toContain("Last 30 days")
    expect(html).toContain("5 paid")
    expect(html).toContain("Google Ads")
    expect(html).toContain("(100%)")
  })

  it("renders multiple sources in the provided order", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 10,
      topSources: [
        { group: "google_ads", label: "Google Ads", count: 5, share: 0.5 },
        { group: "organic_nonbrand", label: "Organic non-brand", count: 3, share: 0.3 },
        { group: "ai_referral", label: "AI referral", count: 2, share: 0.2 },
      ],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    const idxGoogle = html.indexOf("Google Ads")
    const idxOrganic = html.indexOf("Organic non-brand")
    const idxAi = html.indexOf("AI referral")
    expect(idxGoogle).toBeGreaterThan(-1)
    expect(idxOrganic).toBeGreaterThan(idxGoogle)
    expect(idxAi).toBeGreaterThan(idxOrganic)
    expect(html).toContain("(50%)")
    expect(html).toContain("(30%)")
    expect(html).toContain("(20%)")
  })

  it("uses no colored backgrounds on routine status (calm-chrome contract)", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 3,
      topSources: [
        { group: "google_ads", label: "Google Ads", count: 3, share: 1 },
      ],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 2,
      topSources: [
        { group: "organic_brand", label: "Organic brand", count: 2, share: 1 },
      ],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    expect(html).not.toMatch(/brand-coral|\bcoral\b/)
  })

  it("renders an accessible aria-label on the section", () => {
    const breakdown: AttributionSourceBreakdown = {
      windowDays: 30,
      totalIntakes: 1,
      topSources: [
        { group: "direct", label: "Direct", count: 1, share: 1 },
      ],
    }
    const html = render(<AttributionSourcesCard breakdown={breakdown} />)
    expect(html).toContain('aria-label="Where patients came from"')
  })
})
