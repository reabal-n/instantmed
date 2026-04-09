/**
 * Clinical Summary Render Tests
 *
 * Regression guard for the doctor-portal field-name bug (2026-04-09):
 * intake writes camelCase keys (edOnset, hairPattern, etc.) but the
 * subtype field map used to expect only snake_case. This test locks
 * in that ClinicalSummary renders camelCase ED and hair-loss answers
 * into the subtype-specific assessment panel with readable labels.
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalSummary — ED subtype (camelCase keys)", () => {
  const edAnswers = {
    edOnset: "gradual_over_months",
    edFrequency: "most_of_the_time",
    edMorningErections: "rarely",
    edAgeConfirmed: true,
    edHypertension: false,
    edDiabetes: false,
    edPreference: "as_needed",
    edAdditionalInfo: "Recently started new job, lots of stress",
    nitrates: false,
    recentHeartEvent: false,
    severeHeartCondition: false,
    previousEdMeds: "never",
  }

  it("renders the ED Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("Erectile Dysfunction Assessment")
  })

  it("renders readable labels for camelCase ED fields", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("ED onset")
    expect(html).toContain("Frequency of ED")
    expect(html).toContain("Morning erections")
    expect(html).toContain("Treatment preference")
    expect(html).toContain("Nitrate use")
    expect(html).toContain("Recent heart event")
    expect(html).toContain("Severe heart condition")
    expect(html).toContain("Previous ED medication use")
  })

  it("does NOT auto-format camelCase keys to 'Ed Onset'", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).not.toContain("Ed Onset")
    expect(html).not.toContain("Ed Frequency")
    expect(html).not.toContain("Ed Morning Erections")
  })
})

describe("ClinicalSummary — hair loss subtype (camelCase keys)", () => {
  const hairLossAnswers = {
    hairPattern: "crown_thinning",
    hairDuration: "1-3_years",
    hairFamilyHistory: "father_paternal",
    hairPreviousTreatments: "none",
    hairMedicationPreference: "oral",
    hairScalpConditions: "none",
    hairAdditionalInfo: "Noticed more hair in the shower",
  }

  it("renders the Hair Loss Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair Loss Assessment")
  })

  it("renders readable labels for camelCase hair-loss fields", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair loss pattern")
    expect(html).toContain("Duration of hair loss")
    expect(html).toContain("Family history")
    expect(html).toContain("Previous hair-loss treatments")
    expect(html).toContain("Treatment preference")
    expect(html).toContain("Scalp conditions")
  })

  it("does NOT auto-format camelCase keys to 'Hair Pattern'", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).not.toContain("Hair Duration")
    expect(html).not.toContain("Hair Family History")
  })
})

describe("ClinicalSummary — legacy snake_case compat", () => {
  it("still renders legacy snake_case ED keys when present", () => {
    const legacyEd = {
      ed_onset: "sudden",
      ed_frequency: "half_the_time",
      morning_erections: "sometimes",
      nitrate_use: false,
      cardiovascular_history: "none",
    }
    const html = render(<ClinicalSummary answers={legacyEd} consultSubtype="ed" />)
    expect(html).toContain("Erectile Dysfunction Assessment")
    // Labels for legacy keys can use auto-format or explicit — just make
    // sure the answers aren't hidden.
    expect(html).toContain("sudden")
    expect(html).toContain("half_the_time")
  })
})
