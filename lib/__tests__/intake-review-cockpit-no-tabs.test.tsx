import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const cockpitSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review/intake-review-cockpit.tsx"),
  "utf-8",
)

describe("IntakeReviewCockpit source contract", () => {
  it("does not import or render Tabs primitives", () => {
    expect(cockpitSource).not.toMatch(/from\s+["']@\/components\/ui\/tabs["']/)
    expect(cockpitSource).not.toMatch(/<Tabs[\s>]/)
    expect(cockpitSource).not.toMatch(/<TabsTrigger/)
    expect(cockpitSource).not.toMatch(/<TabsList/)
    expect(cockpitSource).not.toMatch(/<TabsContent/)
  })

  it("renders the secondary disclosure", () => {
    expect(cockpitSource).toMatch(/IntakeSecondaryDisclosure/)
    // The disclosure import must resolve to the canonical sibling file.
    expect(cockpitSource).toMatch(
      /from\s+["']@\/components\/doctor\/review\/intake-secondary-disclosure["']/,
    )
  })

  it("renders the prescription recommendation card", () => {
    expect(cockpitSource).toMatch(/PrescriptionRecommendationCard/)
    expect(cockpitSource).toMatch(
      /from\s+["']@\/components\/doctor\/review\/prescription-recommendation-card["']/,
    )
  })

  it("preserves the Cmd+N notes shortcut wiring", () => {
    // useDoctorShortcuts must still receive an onNote handler that focuses notesRef.
    expect(cockpitSource).toMatch(/onNote/)
    expect(cockpitSource).toMatch(/notesRef/)
  })

  it("focuses the visible draft note on Cmd+N without opening a duplicate editor", () => {
    expect(cockpitSource).toMatch(/notesRef\.current\?\.focus\(\)/)
    expect(cockpitSource).not.toMatch(/ClinicalNotesEditor/)
  })

  it("hides the duplicate prescription preset in RequestInfoCard", () => {
    // RequestInfoCard owns the legacy inline preset block; the cockpit must
    // suppress it so PrescriptionRecommendationCard does not double-render.
    expect(cockpitSource).toMatch(/hidePrescriptionIntent/)
  })
})
