import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { IntakeFlagsPanel } from "@/components/doctor/intake-flags-panel"
import { makeIntakeFlag, parseIntakeFlags } from "@/lib/clinical/intake-flags"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("IntakeFlagsPanel", () => {
  it("renders nothing when there are no flags", () => {
    expect(render(<IntakeFlagsPanel flags={[]} />)).toBe("")
  })

  it("lists each flag's label and detail", () => {
    const html = render(
      <IntakeFlagsPanel flags={[makeIntakeFlag("medication_strength_missing", { detail: "Atorvastatin" })]} />,
    )
    expect(html).toContain("Strength not provided")
    expect(html).toContain("Atorvastatin")
  })

  it("orders attention flags before info flags", () => {
    const html = render(
      <IntakeFlagsPanel
        flags={[makeIntakeFlag("medication_count_high"), makeIntakeFlag("medication_strength_missing")]}
      />,
    )
    expect(html.indexOf("Strength not provided")).toBeLessThan(html.indexOf("More than 5 medications"))
  })

  it("renders a flag read from the persisted risk_flags JSONB shape (the slide-over path)", () => {
    // Exactly what intakes.risk_flags holds and what the review slide-over passes:
    // parseIntakeFlags(data.intake.risk_flags) -> IntakeFlagsPanel.
    const persisted: unknown = [
      {
        code: "medication_strength_missing",
        label: "Strength not provided",
        source: "clinical",
        severity: "attention",
        detail: "Atorvastatin",
      },
    ]
    const html = render(<IntakeFlagsPanel flags={parseIntakeFlags(persisted)} />)
    expect(html).toContain("Strength not provided")
    expect(html).toContain("Atorvastatin")
  })
})
