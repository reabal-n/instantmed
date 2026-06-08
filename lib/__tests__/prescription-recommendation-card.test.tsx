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
  it("renders medication name, strength, quantity, and repeat count", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    expect(html).toContain("Tadalafil")
    expect(html).toContain("5mg")
    expect(html).toContain("30 tablets")
    expect(html).toContain("2 rpts")
    expect(html).toContain("Parchment")
  })

  it("does not render directions, footer copy, or copy controls", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    expect(html).not.toContain("Take 1 tablet once daily")
    expect(html).not.toContain("Confirm medicine")
    expect(html).not.toMatch(/Copy context/i)
    expect(html).not.toMatch(/Copy medication/i)
  })

  it("does not render alternativeNote — distilled card omits verbose context", () => {
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
    expect(html).not.toContain("Tadalafil 5mg daily is an alternative")
  })

  it("renders caution checks as joined text without a Cautions heading", () => {
    const html = render(
      <PrescriptionRecommendationCard
        intent={{
          ...baseIntent,
          cautionChecks: ["Alpha blocker use", "GP-cleared cardiac history"],
        }}
      />,
    )
    expect(html).toContain("Tadalafil")
    expect(html).toContain("Alpha blocker use")
    expect(html).toContain("GP-cleared cardiac history")
    expect(html).not.toContain("Cautions")
  })

  it("omits caution section when cautionChecks is empty", () => {
    const html = render(<PrescriptionRecommendationCard intent={baseIntent} />)
    expect(html).not.toContain("amber")
  })

  it("renders nothing when intent is undefined", () => {
    const html = render(<PrescriptionRecommendationCard intent={undefined} />)
    expect(html).toBe("")
  })

  it("renders only qty/repeats when medication name is absent", () => {
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
    expect(html).toContain("30 tablets")
    expect(html).not.toMatch(/Copy medication/i)
    expect(html).not.toMatch(/Copy context/i)
  })
})
