import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildReviewPacket } from "@/lib/clinical/review-packet"

const currentRequest = vi.hoisted(() => ({
  category: "prescription",
  subtype: undefined as string | undefined,
  serviceType: "repeat-script",
  answers: {} as Record<string, unknown>,
}))

vi.mock("@/components/doctor/review/intake-review-context", () => ({
  useIntakeReview: () => ({
    data: {}, intake: { category: currentRequest.category, subtype: currentRequest.subtype, patient: { full_name: "Synthetic Review" } },
    service: { type: currentRequest.serviceType }, answers: currentRequest.answers, doctorNotes: "",
    setDoctorNotes: () => undefined, setNoteSaved: () => undefined,
    noteDirty: false, savedAt: null, isAutoSaving: false, autoSaveError: false,
    isPending: false, notesRef: { current: null }, handleSaveNotes: async () => undefined,
  }),
}))

function renderRequest(answers: Record<string, unknown>, subtype?: string) {
  Object.assign(currentRequest, { category: subtype ? "consult" : "prescription", serviceType: subtype ? "consult" : "repeat-script", subtype, answers })
  const summary = buildClinicalCaseSummary(currentRequest)
  const packet = buildReviewPacket({ ...currentRequest, summary })
  return renderToStaticMarkup(<RequestInfoCard packet={packet} summary={summary} draftNoteOpen={false} onDraftNoteOpenChange={() => undefined} />)
}

describe("RequestInfoCard source-faithful clinical facts", () => {
  it("groups ED context and named explicit negatives while keeping the complete prior treatment once", () => {
    const html = renderRequest({
      edDuration: "1_to_3_years", edErectionFrequency: 3, edPreference: "daily",
      edNitrates: false, edRecentHeartEvent: "no", edSevereHeart: false, edAlphaBlockers: false,
      previousEdMeds: true, edPreviousTreatment: "Synthetic medicine 10 mg only when needed, with food.",
    }, "ed")
    const context = html.match(/<dl[^>]*data-review-clinical-context="true"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || ""
    const negatives = html.match(/<dl[^>]*data-review-negative-screening="true"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || ""

    expect(context).toContain("1-3 years")
    expect(context).toContain("3/5 (about half the time)")
    expect(context).toContain("Daily")
    expect(negatives).toContain('data-review-fact="nitrate_use"')
    expect(negatives).toContain('data-review-fact="recent_heart_event"')
    expect(negatives).toContain('data-review-fact="severe_heart_condition"')
    expect(negatives).toContain('data-review-fact="alpha_blockers"')
    expect(negatives.match(/>No<\/dd>/g)).toHaveLength(4)
    expect(html.match(/Synthetic medicine 10 mg only when needed, with food\./g)).toHaveLength(1)
    expect(html).not.toContain("Previous treatment detail")
    expect(html).not.toContain("Blood pressure medication")
  })

  it("keeps positive and missing ED screens, current medicines and inconsistent prior treatment outside the negative row", () => {
    const html = renderRequest({
      edNitrates: false, edRecentHeartEvent: true, edGpCleared: true, edAlphaBlockers: false,
      previousEdMeds: false, edPreviousTreatment: "Previously took a recorded medicine.",
      current_medications: "Current medicine 5 mg daily", edAdditionalInfo: "No",
    }, "ed")
    const negatives = html.match(/<dl[^>]*data-review-negative-screening="true"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || ""

    expect(negatives).toContain('data-review-fact="nitrate_use"')
    for (const key of ["recent_heart_event", "severe_heart_condition", "gp_clearance_reported", "previous_ed_medication", "patient_notes"]) {
      expect(negatives).not.toContain(`data-review-fact="${key}"`)
      expect(html).toContain(`data-review-fact="${key}"`)
    }
    expect(html).toContain('data-review-fact="severe_heart_condition" data-review-fact-state="missing"')
    expect(html).toContain("Recent cardiac event")
    expect(html).toContain("Current medicine 5 mg daily")
    expect(html).toContain("Previous treatment detail")
    expect(html).toContain("Previously took a recorded medicine.")
  })

  it.each([undefined, "none", "nil", "n/a", "not sure"])("does not classify an absent, ambiguous or free-text ED screen (%s) as a confirmed negative", (edNitrates) => {
    const html = renderRequest({ edNitrates, edAlphaBlockers: false }, "ed")
    const negatives = html.match(/<dl[^>]*data-review-negative-screening="true"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || ""

    expect(negatives).toContain('data-review-fact="alpha_blockers"')
    expect(negatives).not.toContain('data-review-fact="nitrate_use"')
    expect(html).toContain('data-review-fact="nitrate_use"')
  })

  it("retains missing previous-treatment status alongside entered detail", () => {
    const html = renderRequest({ edPreviousTreatment: "Recorded treatment without a yes/no response" }, "ed")

    expect(html).toContain('data-review-fact="previous_ed_medication" data-review-fact-state="missing"')
    expect(html).toContain("Not recorded")
    expect(html).toContain("Recorded treatment without a yes/no response")
  })

  it("groups only explicit repeat-prescription negatives while leaving conflicting and missing answers visible", () => {
    const html = renderRequest({
      hasConditions: false, hasAdverseMedicationReactions: false, isPregnantOrBreastfeeding: false,
      hasAllergies: false, allergies: "Penicillin rash", hasSideEffects: true,
    })
    const negatives = html.match(/<dl[^>]*data-review-negative-screening="true"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || ""

    expect(negatives).toContain('data-review-safety-row="conditions"')
    expect(negatives).toContain("No conditions")
    expect(negatives).toContain("No medicine reactions")
    expect(negatives).toContain("Not pregnant/breastfeeding")
    expect(negatives).not.toContain('data-review-safety-row="allergies"')
    expect(negatives).not.toContain('data-review-safety-row="side_effects"')
    expect(html).toContain("Answered no. Recorded details: Penicillin rash")
    expect(html).toContain("Yes. Side-effect details missing")
    expect(html).toContain("Not captured in this request")
  })

  it("renders complete long medicine labels and qualified directions with truthful frequency", () => {
    const html = renderRequest({
      medications: [
        { name: "Synthetic prolonged release medicine alpha", strength: "75 mg", form: "capsule" },
        { name: "Synthetic combination medicine beta", strength: "20 mg / 5 mg", form: "tablet" },
      ],
      currentDose: "Alpha: take 1 capsule each morning with food; beta: take 1 tablet every second night only if symptoms recur.",
      indication: "Patient-reported reason", doseChanged: false,
    })
    expect(html).toContain("Synthetic prolonged release medicine alpha 75 mg capsule")
    expect(html).toContain("Synthetic combination medicine beta 20 mg / 5 mg tablet")
    expect(html).toContain("Alpha: take 1 capsule each morning with food; beta: take 1 tablet every second night only if symptoms recur.")
    expect(html).toContain("Not separately captured; see directions")
    expect(html).toContain("Patient-reported reason")
  })

  it("renders individually labelled negative, positive, conflicting and uncaptured safety rows", () => {
    const html = renderRequest({ medicationName: "Synthetic medicine", medicationStrength: "10mg", currentDose: "Once daily", indication: "Anxiety", doseChanged: false,
      hasConditions: false, hasAllergies: true, allergies: "Penicillin rash",
      hasOtherMedications: false, otherMedications: "Warfarin", hasSideEffects: true,
    })
    expect(html).toContain('data-review-safety-row="conditions"')
    expect(html).toContain("No conditions")
    expect(html).toContain("Anxiety")
    expect(html).toContain('data-review-safety-row="allergies"')
    expect(html).toContain("Yes. Penicillin rash")
    expect(html.match(/Penicillin rash/g)).toHaveLength(1)
    expect(html).toContain("Answered no. Recorded details: Warfarin")
    expect(html).toContain("Yes. Side-effect details missing")
    expect(html).toContain("Not captured in this request")
    expect(html).toContain("Once daily")
    expect(html).toContain("Confirm dose and frequency")
  })
})
