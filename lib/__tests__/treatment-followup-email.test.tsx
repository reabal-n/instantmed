import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect,it } from "vitest"

import {
  TreatmentFollowupEmail,
  treatmentFollowupSubject,
} from "@/lib/email/components/templates/treatment-followup"

describe("TreatmentFollowupEmail", () => {
  it("renders ED month_3 copy with correct CTA link", () => {
    const html = renderToStaticMarkup(
      <TreatmentFollowupEmail
        patientName="Alex"
        followupId="fu_123"
        subtype="ed"
        milestone="month_3"
        appUrl="https://instantmed.com.au"
      />
    )
    expect(html).toContain("Alex")
    expect(html).toContain("3-month")
    expect(html).toContain("https://instantmed.com.au/patient/followups/fu_123")
    // TGA: no drug names
    expect(html).not.toMatch(/sildenafil|tadalafil|viagra|cialis|finasteride|minoxidil/i)
  })

  it("renders hair-loss month_12 copy", () => {
    const html = renderToStaticMarkup(
      <TreatmentFollowupEmail
        patientName="Sam"
        followupId="fu_456"
        subtype="hair_loss"
        milestone="month_12"
        appUrl="https://instantmed.com.au"
      />
    )
    expect(html).toContain("Sam")
    expect(html).toContain("12-month")
    expect(html).not.toMatch(/finasteride|minoxidil|propecia|rogaine/i)
  })

  it("treatmentFollowupSubject returns milestone-specific subject", () => {
    expect(treatmentFollowupSubject("ed", "month_3")).toContain("3-month")
    expect(treatmentFollowupSubject("hair_loss", "month_6")).toContain("6-month")
  })
})
