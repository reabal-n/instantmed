import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ParchmentPrescribePanel } from "@/components/doctor/parchment-prescribe-panel"
import { PanelProvider } from "@/components/panels/panel-provider"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildParchmentPrescriptionContext, type ParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"

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

const edAnswers = {
  edDuration: "6_12_months",
  edAgeConfirmed: true,
  edErectionFrequency: 3,
  edPreference: "prn",
  edNitrates: false,
  edRecentHeartEvent: false,
  edSevereHeart: false,
  edAlphaBlockers: false,
  edPreviousTreatment: "Earlier trial caused headaches",
}

const pillAnswers = {
  womensHealthOption: "ocp_new",
  contraceptionType: "start",
  pregnancyStatus: "no",
  womens_migraine_aura: false,
  womens_blood_clot_history: false,
  womens_smoker: false,
  contraceptionDetails: "Patient prefers a tablet option",
}

describe("ParchmentPrescribePanel clinical context", () => {
  it("renders one internally scrollable reference beside a separately bounded provider region", () => {
    const html = renderPanel(specialtyContext)
    expect(html.match(/data-parchment-medication-context=/g)).toHaveLength(1)
    expect(html).toContain('data-parchment-workspace="true"')
    expect(html).toContain('data-parchment-provider="true"')
    expect(html.match(/Take one tablet daily\./g)).toHaveLength(1)
  })

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

  it.each([
    [
      { edAlphaBlockers: true },
      "Alpha blocker use",
      "Alpha blockers can increase hypotension risk with PDE5 inhibitors. Confirm medication and dosing separation.",
    ],
    [
      { edRecentHeartEvent: true, edGpCleared: true },
      "Recent cardiac event",
      "Patient reports GP clearance. Verify clearance and cardiovascular stability before considering ED medication.",
    ],
    [
      { edSevereHeart: true, edGpCleared: true },
      "Severe heart condition",
      "Patient reports GP clearance. Confirm details before prescribing.",
    ],
  ])("keeps the real ED %s caution visible before collapsed assessment", (overrides, label, detail) => {
    const source = { category: "consult", subtype: "ed", answers: { ...edAnswers, ...overrides } }
    const context = buildParchmentPrescriptionContext(buildClinicalCaseSummary(source), source)
    expect(context).not.toBeNull()
    const html = renderPanel(context!)

    expect(html).toContain(label)
    expect(html).toContain(detail)
    expect(html).toContain('data-parchment-safety-severity="caution"')
    expect(html.indexOf(detail)).toBeLessThan(html.indexOf("Clinical details"))
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain("Earlier trial caused headaches")
    expect(context?.assessmentFacts).toContainEqual(expect.objectContaining({ value: "Earlier trial caused headaches" }))
  })

  it("keeps real combined-pill contraindications visible while preserving the POP handoff", () => {
    const source = {
      category: "consult", subtype: "womens_health",
      answers: { ...pillAnswers, womens_migraine_aura: true, womens_blood_clot_history: true },
    }
    const context = buildParchmentPrescriptionContext(buildClinicalCaseSummary(source), source)
    expect(context).not.toBeNull()
    const html = renderPanel(context!)

    expect(html).toContain("Migraine with aura: YES - combined oral contraceptive contraindicated (raised stroke risk). Steer to a progestogen-only pill.")
    expect(html).toContain("Blood clot history: YES - combined oral contraceptive contraindicated (VTE risk). Steer to a progestogen-only pill.")
    expect(html).toContain("Doctor to select a progestogen-only pill in Parchment if clinically appropriate after confirming pregnancy exclusion, allergies, current medicines, and patient preference.")
    expect(html.match(/data-parchment-safety-severity="block"/g)).toHaveLength(2)
    expect(html.indexOf("Migraine with aura: YES")).toBeLessThan(html.indexOf("Clinical details"))
    expect(html).not.toContain("Not pregnant per patient report.")
    expect(html).not.toContain("Non-smoker per patient report.")
    expect(html).not.toContain("Patient prefers a tablet option")
    expect(context?.assessmentFacts).toContainEqual(expect.objectContaining({ value: "Patient prefers a tablet option" }))
  })

  it.each([
    ["ed", edAnswers],
    ["womens_health", pillAnswers],
  ])("keeps an all-negative %s screen compact without routine safety messages", (subtype, answers) => {
    const source = { category: "consult", subtype, answers }
    const context = buildParchmentPrescriptionContext(buildClinicalCaseSummary(source), source)
    expect(context).not.toBeNull()
    const html = renderPanel(context!)

    expect(html).not.toContain('aria-label="Prescribing safety"')
    expect(html).not.toContain("Not pregnant per patient report.")
    expect(html).not.toContain("Non-smoker per patient report.")
    expect(html).toContain("Clinical details")
    expect(html).toContain('aria-expanded="false"')
  })
})
