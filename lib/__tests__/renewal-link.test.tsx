import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RenewalLink } from "@/components/doctor/renewal-link"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("RenewalLink", () => {
  it("renders nothing when no renewal match", () => {
    expect(render(<RenewalLink renewalMatch={null} patientId="p1" />)).toBe("")
  })

  it("renders nothing when renewalMatch is undefined", () => {
    expect(render(<RenewalLink renewalMatch={undefined} patientId="p1" />)).toBe("")
  })

  it("renders 'View prior Tadalafil 5mg script' link with patient deep-link", () => {
    const html = render(
      <RenewalLink
        renewalMatch={{
          medicationName: "Tadalafil",
          strength: "5mg",
          priorPrescriptionId: "rx-123",
        }}
        patientId="p-456"
      />,
    )
    expect(html).toContain("View prior")
    expect(html).toContain("Tadalafil 5mg")
    expect(html).toContain('href="/doctor/patients/p-456')
    expect(html).toContain("rx-123")
  })

  it("falls back to medication name only when strength is absent", () => {
    const html = render(
      <RenewalLink
        renewalMatch={{
          medicationName: "Sertraline",
          strength: null,
          priorPrescriptionId: "rx-456",
        }}
        patientId="p-1"
      />,
    )
    expect(html).toContain("Sertraline")
    expect(html).not.toContain("null")
  })

  it("renders the link without a deep-link anchor when priorPrescriptionId is missing", () => {
    const html = render(
      <RenewalLink
        renewalMatch={{
          medicationName: "Metformin",
          strength: "500mg",
          priorPrescriptionId: null,
        }}
        patientId="p-1"
      />,
    )
    // Still renders the prior-script link to the patient profile,
    // just without the focus deep-link param.
    expect(html).toContain("Metformin 500mg")
    expect(html).toContain('href="/doctor/patients/p-1')
    expect(html).not.toContain("focus=")
  })

  it("collapses whitespace in strength like the existing renewal formatter", () => {
    const html = render(
      <RenewalLink
        renewalMatch={{
          medicationName: "Atorvastatin",
          strength: "   ",
          priorPrescriptionId: "rx-789",
        }}
        patientId="p-2"
      />,
    )
    expect(html).toContain("View prior Atorvastatin script")
  })
})
