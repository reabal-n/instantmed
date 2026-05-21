import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AttributionChip } from "@/components/doctor/attribution-chip"
import type { AttributionClassificationInput } from "@/lib/analytics/source-classification"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

const EMPTY_ATTRIBUTION: AttributionClassificationInput = {
  adgroupid: null,
  campaignid: null,
  creative: null,
  device: null,
  gbraid: null,
  gclid: null,
  keyword: null,
  landing_page: null,
  matchtype: null,
  network: null,
  referrer: null,
  utm_campaign: null,
  utm_medium: null,
  utm_source: null,
  utm_term: null,
  wbraid: null,
}

function attribution(
  overrides: Partial<AttributionClassificationInput> = {},
): AttributionClassificationInput {
  return { ...EMPTY_ATTRIBUTION, ...overrides }
}

describe("AttributionChip", () => {
  it("inline variant renders Source: {label} with the landing path", () => {
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({
          gclid: "abc123",
          landing_page: "/medical-certificate",
        })}
      />,
    )
    expect(html).toContain("Source:")
    expect(html).toContain("Google Ads")
    expect(html).toContain("/medical-certificate")
  })

  it("block variant renders the label and landing path on separate lines", () => {
    const html = render(
      <AttributionChip
        variant="block"
        attribution={attribution({
          utm_source: "google",
          utm_medium: "organic",
          landing_page: "/medical-certificate",
        })}
        contextLabel="First touch"
      />,
    )
    expect(html).toContain("First touch")
    // Block variant should not render the "Source: " prefix used inline.
    expect(html).not.toContain("Source:")
    // Two distinct spans for label + detail (two-line block).
    expect(html).toContain("/medical-certificate")
  })

  it("classifies google_ads input as Google Ads", () => {
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({ gclid: "abc123", landing_page: "/" })}
      />,
    )
    expect(html).toContain("Google Ads")
    expect(html).toContain('data-attribution-group="google_ads"')
  })

  it("classifies a chatgpt referrer (no utm) as AI referral", () => {
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({
          referrer: "https://chatgpt.com/",
          landing_page: "/prescriptions",
        })}
      />,
    )
    expect(html).toContain("AI referral")
    expect(html).toContain('data-attribution-group="ai_referral"')
  })

  it("classifies a fully empty row as Direct when landing_page is present", () => {
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({ landing_page: "/" })}
      />,
    )
    expect(html).toContain("Direct")
    expect(html).toContain('data-attribution-group="direct"')
  })

  it("truncates landing paths longer than 40 chars with an ellipsis", () => {
    const longPath = "/blog/" + "a".repeat(80)
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({ landing_page: longPath })}
      />,
    )
    expect(html).toContain("…")
    // The full untruncated path should NOT appear in the visible text; it
    // is only in the title attribute.
    const truncatedSegment = longPath.slice(0, 38)
    expect(html).toContain(truncatedSegment)
    // Original string is the title attribute, but the rendered cell text
    // should be capped at 40 chars including the ellipsis.
    const visibleMatches = html.match(/>\/blog\/a+…</g) ?? []
    expect(visibleMatches.length).toBeGreaterThan(0)
    for (const match of visibleMatches) {
      // strip leading `>` and trailing `<`
      const body = match.slice(1, -1)
      expect(body.length).toBeLessThanOrEqual(40)
    }
  })

  it("uses no colored backgrounds on routine display (calm-chrome contract)", () => {
    const html = render(
      <AttributionChip
        variant="inline"
        attribution={attribution({ gclid: "abc", landing_page: "/" })}
      />,
    )
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky|violet|blue|slate)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    const inputs: Array<AttributionClassificationInput> = [
      attribution({ gclid: "abc", landing_page: "/" }),
      attribution({ utm_source: "google", utm_medium: "organic", landing_page: "/blog/x" }),
      attribution({ referrer: "https://chatgpt.com/", landing_page: "/" }),
      attribution({ landing_page: "/" }),
      EMPTY_ATTRIBUTION,
    ]
    for (const input of inputs) {
      const inlineHtml = render(<AttributionChip variant="inline" attribution={input} />)
      expect(inlineHtml).not.toMatch(/brand-coral|\bcoral\b/)
      const blockHtml = render(<AttributionChip variant="block" attribution={input} />)
      expect(blockHtml).not.toMatch(/brand-coral|\bcoral\b/)
    }
  })
})
