import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PrescriptionRecommendationCard } from "@/components/doctor/review/prescription-recommendation-card"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

const baseIntent = {
  presetLabel: "ED Parchment handoff context",
  medicationName: "Tadalafil",
  strength: "5mg",
  form: "tablet",
  medicationSearchHint: "Tadalafil 5mg tablet",
  directionsTemplate: "Take 1 tablet once daily, at the same time each day.",
  quantityTemplate: "30 tablets",
  repeatsTemplate: "2",
  safetyChecks: [],
  parchmentMode: "open_patient_prescribe" as const,
  clipboardText: "Tadalafil 5mg, 30 tablets, 2 repeats",
}

describe("PrescriptionRecommendationCard", () => {
  it("renders medication name, strength, quantity, repeats and concise handoff context", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    expect(html).toContain("Parchment handoff context")
    expect(html).toContain("Tadalafil")
    expect(html).toContain("5mg")
    expect(html).toContain("30 tablets")
    expect(html).toContain("Repeats: 2")
    expect(html).toContain("Take 1 tablet once daily")
    expect(html).toContain("Confirm medicine, dose and all prescribing details")
  })

  it("does not render one-click prescription copy controls", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    expect(html).not.toMatch(/Copy context/i)
    expect(html).not.toMatch(/Copy medication/i)
  })

  it("renders the alternative context note when present", () => {
    const html = render(
      <PrescriptionRecommendationCard
        intent={{
          ...baseIntent,
          medicationName: "Sildenafil",
          strength: "50mg",
          alternativeNote: "Tadalafil 5mg daily is an alternative for patients who prefer daily dosing.",
        }}
      />,
    )
    expect(html).toContain("Tadalafil 5mg daily is an alternative")
  })

  it("renders caution checks without hiding the handoff context", () => {
    const html = render(
      <PrescriptionRecommendationCard
        intent={{
          ...baseIntent,
          cautionChecks: ["Alpha blocker use", "GP-cleared cardiac history"],
        }}
      />,
    )

    expect(html).toContain("Tadalafil")
    expect(html).toContain("Cautions")
    expect(html).toContain("Alpha blocker use")
    expect(html).toContain("GP-cleared cardiac history")
  })

  it("omits the alternative note when not provided", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    // Use the specific fixture phrasing rather than the bare word "alternative",
    // so unrelated future copy changes that happen to use that word do not
    // silently break this regression guard.
    expect(html).not.toContain("Tadalafil 5mg daily is an alternative")
  })

  it("renders nothing when intent is undefined", () => {
    const html = render(<PrescriptionRecommendationCard intent={undefined} />)
    expect(html).toBe("")
  })

  it("hides the Copy medication button when no medication name is set", () => {
    const html = render(
      <PrescriptionRecommendationCard
        intent={{
          ...baseIntent,
          medicationName: undefined,
          strength: undefined,
          form: undefined,
        }}
      />,
    )
    expect(html).not.toMatch(/Copy medication/i)
    expect(html).not.toMatch(/Copy context/i)
  })
})
