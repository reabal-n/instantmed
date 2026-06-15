import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { IntakeFlagsBadge, IntakeFlagsPanel } from "@/components/doctor/intake-flags-panel"
import { makeIntakeFlag } from "@/lib/clinical/intake-flags"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("IntakeFlagsBadge", () => {
  it("renders the attention flag's label", () => {
    const html = render(<IntakeFlagsBadge flags={[makeIntakeFlag("medication_strength_missing")]} />)
    expect(html).toContain("Strength not provided")
  })

  it("renders nothing when there are no attention flags (info-only or empty)", () => {
    expect(render(<IntakeFlagsBadge flags={[makeIntakeFlag("medication_count_high")]} />)).toBe("")
    expect(render(<IntakeFlagsBadge flags={[]} />)).toBe("")
  })

  it("summarizes multiple attention flags as a count", () => {
    const html = render(
      <IntakeFlagsBadge
        flags={[makeIntakeFlag("medication_strength_missing"), makeIntakeFlag("medication_form_missing")]}
      />,
    )
    expect(html).toMatch(/2 flags/)
  })
})

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
})
