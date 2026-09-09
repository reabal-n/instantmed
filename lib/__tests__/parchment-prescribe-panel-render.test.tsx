import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ParchmentPrescribePanel } from "@/components/doctor/parchment-prescribe-panel"
import { PanelProvider } from "@/components/panels/panel-provider"
import type { ParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"

function renderPanel(context: ParchmentPrescriptionContext): string {
  return renderToStaticMarkup(
    <PanelProvider>
      <ParchmentPrescribePanel
        intakeId="synthetic-prescribing-request"
        patientName="Synthetic Patient"
        prescriptionContext={context}
      />
    </PanelProvider>,
  )
}

const specialtyContext: ParchmentPrescriptionContext = {
  requestLabel: "Erectile dysfunction consult",
  presetLabel: "ED Parchment handoff context",
  medicationLabel: "Tadalafil 5 mg tablet",
  regimenSource: "template",
  directionsTemplate: "Take one tablet daily. Confirm the full regimen and suitability in Parchment before issue.",
  copyText: "Tadalafil",
  requestedNameCopyText: "Tadalafil",
  assessmentFacts: [
    { key: "duration", label: "Duration", value: "1–3 years", state: "confirmed", provenance: "current_request" },
    { key: "prior_treatment", label: "Prior treatment", value: "Earlier trial caused headaches", state: "confirmed", provenance: "current_request" },
  ],
}

describe("ParchmentPrescribePanel clinical context", () => {
  it("keeps the full specialty regimen and short request visible while assessment starts collapsed", () => {
    const html = renderPanel(specialtyContext)

    expect(html).toContain("Tadalafil 5 mg tablet")
    expect(html).toContain("Take one tablet daily. Confirm the full regimen and suitability in Parchment before issue.")
    expect(html).toContain("Erectile dysfunction consult")
    expect(html).toContain("Template")
    expect(html).toContain("Clinical details")
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain("1–3 years")
    expect(html).not.toContain("Earlier trial caused headaches")
    expect(html).not.toContain("Not separately captured")
    expect(html).toContain('aria-label="Copy verified generic medicine name"')
    expect(html).toContain("Copy Tadalafil")
    expect(html).not.toContain("Current dose / directions")
  })

  it("shows complete patient directions without an uncaptured frequency row", () => {
    const html = renderPanel({
      ...specialtyContext,
      requestLabel: "Repeat prescription",
      regimenSource: "patient_reported",
      patientReportedDose: "Take 1 tablet twice daily when needed; maximum 2 tablets in 24 hours.\nThen review with the usual prescriber.",
      assessmentFacts: undefined,
      requestFacts: [
        { key: "medicine", label: "Medicine", value: "Tadalafil 5 mg tablet", state: "confirmed", provenance: "current_request" },
        { key: "patient_dose", label: "Current dose / directions", value: "Take 1 tablet twice daily when needed; maximum 2 tablets in 24 hours.\nThen review with the usual prescriber.", state: "confirmed", provenance: "current_request" },
        { key: "frequency", label: "Frequency", value: "Not separately captured; see directions", state: "not_asked", provenance: "current_request" },
        { key: "indication", label: "Indication", value: "Patient reports a urinary indication", state: "confirmed", provenance: "current_request" },
      ],
    })

    expect(html).toContain("Take 1 tablet twice daily when needed; maximum 2 tablets in 24 hours.\nThen review with the usual prescriber.")
    expect(html).toContain("Patient reports a urinary indication")
    expect(html).toContain('aria-label="Copy patient-reported directions"')
    expect(html).not.toContain("Not separately captured")
    expect(html).not.toContain('data-parchment-request-fact="frequency"')
    expect(html).not.toContain("Copy frequency")
    expect(html).not.toContain("Clinical details")
  })

  it("retains an independently supplied patient frequency with its own copy action", () => {
    const html = renderPanel({
      ...specialtyContext,
      regimenSource: "patient_reported",
      assessmentFacts: undefined,
      patientReportedDose: "One tablet",
      patientReportedFrequency: "Every other morning, only when needed",
    })

    expect(html).toContain("Every other morning, only when needed")
    expect(html.match(/Every other morning, only when needed/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Copy patient-reported frequency"')
    expect(html).not.toContain("Not separately captured")
  })

  it("keeps a genuine assessment blocker visible before the remaining details", () => {
    const html = renderPanel({
      ...specialtyContext,
      assessmentFacts: [
        ...specialtyContext.assessmentFacts!,
        { key: "nitrate_answer", label: "Nitrate use", value: "Not recorded", state: "missing", provenance: "current_request", issue: "Confirm nitrate answer before prescribing", blocksPrescribing: true },
      ],
    })

    expect(html).toContain("Confirm nitrate answer before prescribing")
    expect(html).toContain('data-parchment-assessment-fact="nitrate_answer"')
    expect(html.indexOf("Confirm nitrate answer before prescribing")).toBeLessThan(html.indexOf("Clinical details"))
    expect(html).not.toContain("Earlier trial caused headaches")
  })

  it("does not add an empty details control when every assessment fact is already a visible blocker", () => {
    const html = renderPanel({
      ...specialtyContext,
      assessmentFacts: [
        { key: "nitrate_answer", label: "Nitrate use", value: "Not recorded", state: "missing", provenance: "current_request", issue: "Confirm nitrate answer before prescribing", blocksPrescribing: true },
      ],
    })

    expect(html).toContain("Confirm nitrate answer before prescribing")
    expect(html).not.toContain("Clinical details")
  })
})
