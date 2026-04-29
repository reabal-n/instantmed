import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalCaseReview", () => {
  it("renders the doctor-first patient story, plan, note, and Parchment preset before raw answers", () => {
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

    expect(html).toContain("Patient story")
    expect(html).toContain("Recommended plan")
    expect(html).toContain("Draft note")
    expect(html).toContain("Parchment preset")
    expect(html).toContain("Full answers")
    expect(html.indexOf("Patient story")).toBeLessThan(html.indexOf("Full answers"))
  })
})
