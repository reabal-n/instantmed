import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { stripGenericClinicalNoteBoilerplate } from "@/components/doctor/review/utils"
import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalCaseReview", () => {
  it("starts the draft note collapsed with the approved review label", () => {
    const html = render(
      <ClinicalCaseReview
        category="medical_certificate"
        serviceType="med_certs"
        patientName="Sam Lee"
        answers={{ symptomDetails: "Fever and cough today." }}
        draftNoteValue="Patient requests a one-day work certificate for acute symptoms."
        onDraftNoteChange={() => undefined}
      />,
    )

    expect(html).toContain("Draft note · Review required")
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain("Patient requests a one-day work certificate")
  })

  it("renders the doctor-first patient story, plan, opened note, and Parchment handoff context before raw answers", () => {
    const html = render(
      <ClinicalCaseReview
        category="consult"
        subtype="ed"
        serviceType="consult"
        patientName="Daniel McDonald"
        answers={{
          edGoal: "improve_erections",
          edDuration: "1_to_3_years",
          edPreference: "daily",
          iiefTotal: 12,
          edNitrates: "no",
          edRecentHeartEvent: "no",
          edSevereHeart: "no",
          edAlphaBlockers: "no",
        }}
        draftNoteOpen
      />,
    )

    expect(html).toContain("Reason for visit")
    expect(html).toContain("Prescribing context")
    expect(html).toContain("Clinical note · Review required")
    expect(html).toContain("Parchment handoff context")
    expect(html).toContain("Full answers")
    expect(html.indexOf("Reason for visit")).toBeLessThan(html.indexOf("Full answers"))
  })

  it("omits med-cert recommendation noise while keeping the draft note editable", () => {
    const html = render(
      <ClinicalCaseReview
        category="medical_certificate"
        serviceType="med_certs"
        patientName="Sam Lee"
        answers={{
          certificateType: "work",
          duration: "1 day",
          symptomDuration: "Today",
          symptomDetails: "Fever and cough today.",
        }}
        hideRecommendedPlan
        draftNoteOpen
        draftNoteValue="Patient requests a one-day work certificate for acute symptoms."
        onDraftNoteChange={() => undefined}
      />,
    )

    expect(html).not.toContain("Clinical plan")
    expect(html).toContain("Draft note · Review required")
    expect(html).toContain("contenteditable")
    expect(html).toContain("Patient requests a one-day work certificate")
  })

  it("renders the recorded-script reconciliation action on the active draft-note surface", () => {
    const html = render(
      <ClinicalCaseReview
        category="prescription"
        serviceType="common_scripts"
        patientName="Pat Recorded"
        answers={{
          medicationName: "Rosuvastatin",
          currentDose: "10 mg nightly",
          dose_changed: false,
        }}
        scriptSent
        compact
        draftNoteOpen
        draftNoteValue="Existing clinical note."
        draftNoteDirty
        onDraftNoteChange={() => undefined}
        onDraftNoteSave={() => undefined}
      />,
    )

    expect(html).toContain("Recorded-script reconciliation note")
    expect(html).toContain("Acknowledge recorded script evidence")
    expect(html).toContain("Do not prescribe again")
    expect(html).not.toContain("cannot be unlocked")
  })

  it("strips generic process-speak note boilerplate before it reaches the editable note", () => {
    expect(
      stripGenericClinicalNoteBoilerplate(
        "Patient history reviewed. Medical certificate request requires doctor review before approval.",
      ),
    ).toBe("")
    expect(stripGenericClinicalNoteBoilerplate("Reviewed intake. Patient has fever and cough today.")).toContain(
      "fever and cough",
    )
  })

  it("renders normal women's health safety findings as compact reviewed facts", () => {
    const html = render(
      <ClinicalCaseReview
        category="consult"
        subtype="womens_health"
        serviceType="consult"
        patientName="Siena Harding"
        answers={{
          womensHealthOption: "uti",
          utiSymptoms: ["burning", "frequency", "urgency", "cloudy"],
          utiRedFlags: "no",
          utiPregnant: "no",
        }}
        compact
        hidePatientStory
        draftNoteValue="S: Patient reports lower urinary tract symptoms.\nO: Structured UTI screen completed.\nA: Likely uncomplicated lower UTI.\nP: Prescribe if clinically appropriate."
        onDraftNoteChange={() => undefined}
      />,
    )

    expect(html).toContain('data-compact-safety-summary="true"')
    expect(html).toContain('data-safety-severity="info"')
    expect(html).toContain("Prescribing context")
    expect(html).not.toContain("bg-amber-50")
    expect(html).not.toContain("sticky top-0")
  })

  it("keeps allergies and current medications reachable in-panel in compact mode (not a dead-end hint)", () => {
    const html = render(
      <ClinicalCaseReview
        category="consult"
        subtype="womens_health"
        serviceType="consult"
        patientName="Siena Harding"
        answers={{
          womensHealthOption: "uti",
          utiSymptoms: ["burning", "frequency", "urgency", "cloudy"],
          utiRedFlags: "no",
          utiPregnant: "no",
          known_allergies: "Penicillin — anaphylaxis",
          current_medications: "Sertraline 50mg daily",
        }}
        compact
        hidePatientStory
        showFullAnswers={false}
        draftNoteValue="S: Patient reports lower urinary tract symptoms.\nO: Structured UTI screen completed.\nA: Likely uncomplicated lower UTI.\nP: Prescribe if clinically appropriate."
        onDraftNoteChange={() => undefined}
      />,
    )

    // The allergy + current-medication values must be present in-panel even when
    // they fall past the compact fact cap — rendered inside the expandable
    // <details>, not replaced by a "+N more in full intake" dead-end.
    expect(html).toContain("Penicillin — anaphylaxis")
    expect(html).toContain("Sertraline 50mg daily")
    expect(html).not.toContain("in full intake")
  })

  it("uses a supplied case summary and can suppress request facts owned by ReviewPacket", () => {
    const summary: ClinicalCaseSummary = {
      title: "Repeat prescription",
      patientStory: "Patient requests Effexor.",
      keyFacts: [
        { label: "Requested medication", value: "Effexor" },
        { label: "Strength", value: "75mg" },
      ],
      safetyItems: [],
      recommendedPlan: {
        action: "prescribe",
        title: "Repeat if appropriate",
        rationale: "Structured review complete.",
        nextSteps: [],
      },
      draftNote: "S: Patient requests Effexor.\nO: Review complete.\nA: Stable.\nP: Review.",
    }
    const html = render(
      <ClinicalCaseReview
        answers={{}}
        summary={summary}
        hideRequestFacts
        hidePatientStory
        hideRecommendedPlan
        hidePrescriptionIntent
      />,
    )

    expect(html).not.toContain("Requested medication")
    expect(html).not.toContain("75mg")
    expect(html).toContain("Clinical note · Review required")
  })
})
