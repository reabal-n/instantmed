/**
 * Clinical Summary Render Tests
 *
 * Regression guard for the doctor-portal field-name bug (2026-04-09):
 * intake writes camelCase keys (edOnset, hairPattern, edNitrates,
 * etc.) but the subtype field map used to expect only snake_case. This
 * test locks in that ClinicalSummary renders camelCase ED and hair-loss
 * answers into the subtype-specific assessment panel with readable labels.
 *
 * Fixture keys are grounded in the actual intake step components:
 *   - components/request/steps/ed-assessment-step.tsx
 *   - components/request/steps/ed-health-step.tsx
 *   - components/request/steps/hair-loss-assessment-step.tsx
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalSummary - ED subtype (camelCase keys)", () => {
  // Mirrors the keys written by ed-assessment-step.tsx + ed-health-step.tsx
  const edAnswers = {
    // Assessment step
    edAgeConfirmed: true,
    edOnset: "gradual",
    edFrequency: "often",
    edMorningErections: "rarely",
    edHypertension: false,
    edDiabetes: false,
    edPreference: "prn",
    edAdditionalInfo: "Recently started new job, lots of stress",
    // Safety fields - flat keys from ed-health-step.tsx
    edNitrates: "no",
    edRecentHeartEvent: "no",
    edSevereHeart: "no",
    previousEdMeds: "yes",
  }

  it("renders the ED Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("Erectile Dysfunction Assessment")
  })

  it("renders readable labels for camelCase ED assessment fields", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("ED Onset")
    expect(html).toContain("ED Frequency")
    expect(html).toContain("Morning Erections")
    expect(html).toContain("Treatment Preference")
    expect(html).toContain("Uncontrolled Hypertension")
    expect(html).toContain("Uncontrolled Diabetes")
  })

  it("renders readable labels for ED safety fields", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("Nitrate Use")
    expect(html).toContain("Recent Heart Event")
    expect(html).toContain("Severe Heart Condition")
    expect(html).toContain("Previous ED Medication Use")
  })

  it("does NOT auto-format camelCase keys to 'Ed Onset' or 'Ed Nitrates'", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).not.toContain("Ed Onset")
    expect(html).not.toContain("Ed Frequency")
    expect(html).not.toContain("Ed Nitrates")
    expect(html).not.toContain("Ed Recent Heart Event")
  })

  it("renders the optional edGpCleared flag when present", () => {
    const withManagedCondition = {
      ...edAnswers,
      edRecentHeartEvent: "yes",
      edGpCleared: true,
    }
    const html = render(<ClinicalSummary answers={withManagedCondition} consultSubtype="ed" />)
    expect(html).toContain("GP Cleared Cardiac Condition")
  })
})

describe("ClinicalSummary - hair loss subtype (camelCase keys)", () => {
  // Mirrors the keys written by hair-loss-assessment-step.tsx
  const hairLossAnswers = {
    // Main assessment fields (always present for a completed intake)
    hairPattern: "male_pattern",
    hairDuration: "1_to_2_years",
    hairFamilyHistory: "yes_father",
    hairMedicationPreference: "oral",
    hairAdditionalInfo: "Noticed more hair in the shower",
    // Previous-treatment toggles (only true ones typically present)
    triedMinoxidil: true,
    triedBiotin: true,
    // Scalp condition toggles
    scalpDandruff: true,
  }

  it("renders the Hair Loss Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair Loss Assessment")
  })

  it("renders readable labels for the 5 main hair-loss assessment fields", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair Loss Pattern")
    expect(html).toContain("Hair Loss Duration")
    expect(html).toContain("Family History")
    expect(html).toContain("Treatment Preference")
    expect(html).toContain("Additional Context")
  })

  it("renders readable labels for previous-treatment and scalp toggles", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Tried Minoxidil")
    expect(html).toContain("Tried Biotin")
    expect(html).toContain("Scalp Dandruff")
  })

  it("does NOT auto-format camelCase keys to 'Hair Pattern' or 'Tried Minoxidil'-style fallbacks", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    // "Hair Pattern" would be the auto-format fallback - we override with "Hair Loss Pattern"
    expect(html).not.toContain('">Hair Pattern<')
    expect(html).not.toContain('">Hair Duration<')
    expect(html).not.toContain('">Hair Family History<')
  })
})

describe("ClinicalSummary - legacy snake_case compat", () => {
  it("still renders legacy snake_case ED keys in Additional Information", () => {
    const legacyEd = {
      ed_onset: "sudden",
      ed_frequency: "half_the_time",
      morning_erections: "sometimes",
      nitrate_use: false,
      cardiovascular_history: "none",
    }
    const html = render(<ClinicalSummary answers={legacyEd} consultSubtype="ed" />)
    // Legacy snake_case keys from old intakes fall through to "Additional Information"
    // since the ED fields array now uses the new camelCase keys (edGoal, iiefTotal, etc.)
    expect(html).toContain("Additional Information")
    // The actual values must still be visible - not hidden
    expect(html).toContain("sudden")
    expect(html).toContain("half_the_time")
  })
})
