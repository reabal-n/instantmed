import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { IntakeFlagsBadge, IntakeFlagsPanel } from "@/components/doctor/intake-flags-panel"
import {
  makeEngineSoftFlag,
  makeIntakeFlag,
  parseIntakeFlags,
} from "@/lib/clinical/intake-flags"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("IntakeFlagsBadge (queue/ledger row)", () => {
  it("renders the single attention flag's label", () => {
    const html = render(<IntakeFlagsBadge flags={[makeIntakeFlag("medication_strength_missing")]} />)
    expect(html).toContain("Strength not provided")
  })

  it("summarizes multiple attention flags as a count", () => {
    const html = render(
      <IntakeFlagsBadge
        flags={[makeIntakeFlag("medication_strength_missing"), makeIntakeFlag("dose_not_stated")]}
      />,
    )
    expect(html).toMatch(/2 flags/)
  })

  it("does not count an optional-form info flag alongside an attention flag", () => {
    const html = render(
      <IntakeFlagsBadge
        flags={[makeIntakeFlag("medication_strength_missing"), makeIntakeFlag("medication_form_missing")]}
      />,
    )

    expect(html).toContain("Strength not provided")
    expect(html).not.toContain("2 flags")
  })

  it("uses calm action copy for an attention flag in the compact queue", () => {
    const html = render(
      <IntakeFlagsBadge flags={[makeIntakeFlag("medication_strength_missing")]} compact />,
    )
    expect(html).toContain("Check detail")
  })

  it("summarizes multiple compact attention flags without risk language", () => {
    const html = render(
      <IntakeFlagsBadge
        flags={[makeIntakeFlag("medication_strength_missing"), makeIntakeFlag("dose_not_stated")]}
        compact
      />,
    )
    expect(html).toContain("2 details")
  })

  it("renders nothing for optional-form info, other info-only, or empty flag sets", () => {
    expect(render(<IntakeFlagsBadge flags={[makeIntakeFlag("medication_form_missing")]} />)).toBe("")
    expect(render(<IntakeFlagsBadge flags={[makeIntakeFlag("medication_count_high")]} />)).toBe("")
    expect(render(<IntakeFlagsBadge flags={[]} />)).toBe("")
  })

  it("shows engine soft flags as quiet review context without risk language", () => {
    const html = render(
      <IntakeFlagsBadge flags={[makeEngineSoftFlag("panic_co_symptom")]} compact />,
    )

    expect(html).toContain("Review context")
    expect(html).toContain("bg-slate-400")
    expect(html).not.toContain("bg-amber-500")
    expect(html).not.toMatch(/risk/i)
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

  it("presents optional-form info as review context, not doctor attention", () => {
    const html = render(
      <IntakeFlagsPanel flags={[makeIntakeFlag("medication_form_missing", { detail: "Atorvastatin" })]} />,
    )

    expect(html).toContain("Review context")
    expect(html).toContain("Form not provided")
    expect(html).not.toContain("Needs doctor attention")
  })

  it("orders attention flags before info flags", () => {
    const html = render(
      <IntakeFlagsPanel
        flags={[makeIntakeFlag("medication_count_high"), makeIntakeFlag("medication_strength_missing")]}
      />,
    )
    expect(html.indexOf("Strength not provided")).toBeLessThan(html.indexOf("More than one medication"))
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

  it("hides request-field flags after the canonical request packet takes ownership", () => {
    const html = render(
      <IntakeFlagsPanel
        flags={[
          makeIntakeFlag("medication_strength_missing", { detail: "Venlafaxine" }),
          makeIntakeFlag("medication_form_missing", { detail: "Venlafaxine" }),
          makeIntakeFlag("dose_not_stated", { detail: "Venlafaxine" }),
        ]}
        hideRequestFieldFlags
      />,
    )

    expect(html).toBe("")
  })

  it("retains genuine routing and duplicate-identity flags when request fields are hidden", () => {
    const html = render(
      <IntakeFlagsPanel
        flags={[
          makeIntakeFlag("medication_strength_missing", { detail: "Venlafaxine" }),
          makeIntakeFlag("dedicated_service_medication", { detail: "Dedicated pathway" }),
          makeIntakeFlag("duplicate_patient_name_dob"),
        ]}
        hideRequestFieldFlags
      />,
    )

    expect(html).not.toContain("Strength not provided")
    expect(html).toContain("Has a dedicated service pathway")
    expect(html).toContain("Possible duplicate profile")
  })
})
