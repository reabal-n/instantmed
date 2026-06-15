import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { stripGenericClinicalNoteBoilerplate } from "@/components/doctor/review/utils"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalCaseReview", () => {
  it("renders the doctor-first patient story, plan, visible note, and Parchment handoff context before raw answers", () => {
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
      />,
    )

    expect(html).toContain("Reason for visit")
    expect(html).toContain("Prescribing context")
    expect(html).toContain("Check before you send.")
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
        draftNoteValue="Patient requests a one-day work certificate for acute symptoms."
        onDraftNoteChange={() => undefined}
      />,
    )

    expect(html).not.toContain("Clinical plan")
    expect(html).toContain("Check before you send.")
    expect(html).toContain("contenteditable")
    expect(html).toContain("Patient requests a one-day work certificate")
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
})
