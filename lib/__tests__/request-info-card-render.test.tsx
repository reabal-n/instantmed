import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildReviewPacket } from "@/lib/clinical/review-packet"

vi.mock("@/components/doctor/review/intake-review-context", () => ({
  useIntakeReview: () => ({
    data: {}, intake: { category: "prescription", patient: { full_name: "Synthetic Review" } },
    service: { type: "repeat-script" }, answers: {}, doctorNotes: "",
    setDoctorNotes: () => undefined, setNoteSaved: () => undefined,
    noteDirty: false, savedAt: null, isAutoSaving: false, autoSaveError: false,
    isPending: false, notesRef: { current: null }, handleSaveNotes: async () => undefined,
  }),
}))

function renderRequest(answers: Record<string, unknown>) {
  const summary = buildClinicalCaseSummary({ category: "prescription", serviceType: "repeat-script", answers })
  const packet = buildReviewPacket({ category: "prescription", serviceType: "repeat-script", answers, summary })
  return renderToStaticMarkup(<RequestInfoCard packet={packet} summary={summary} draftNoteOpen={false} onDraftNoteOpenChange={() => undefined} />)
}

describe("RequestInfoCard source-faithful clinical facts", () => {
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
