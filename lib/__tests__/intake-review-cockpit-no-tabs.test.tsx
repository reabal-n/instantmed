import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const cockpitSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review/intake-review-cockpit.tsx"),
  "utf-8",
)

const requestInfoSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review/request-info-card.tsx"),
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

  it("keeps raw current-intake answers available only inside the full-intake disclosure", () => {
    const disclosureIndex = cockpitSource.indexOf("<IntakeSecondaryDisclosure")
    const clinicalSummaryIndex = cockpitSource.indexOf("<ClinicalSummary", disclosureIndex)
    const disclosureCloseIndex = cockpitSource.indexOf("</IntakeSecondaryDisclosure>", disclosureIndex)

    expect(cockpitSource).toMatch(/from\s+["']@\/components\/doctor\/clinical-summary["']/)
    expect(clinicalSummaryIndex).toBeGreaterThan(disclosureIndex)
    expect(clinicalSummaryIndex).toBeLessThan(disclosureCloseIndex)
  })

  it("builds one review packet and gives it to the existing request card", () => {
    expect(cockpitSource).toMatch(/buildReviewPacket/)
    expect(cockpitSource).toMatch(/packet=\{reviewPacket\}/)
    expect(cockpitSource).not.toMatch(/PrescribingPacketCard/)
    expect(cockpitSource).not.toMatch(/buildPrescribingPacket/)
    expect(requestInfoSource).toContain("packet.facts")
    expect(requestInfoSource).toContain('data-review-packet="true"')
    expect(requestInfoSource).toContain("hideRequestFacts")
  })

  it("preserves the Cmd+N notes shortcut wiring", () => {
    // useDoctorShortcuts must still receive an onNote handler that focuses notesRef.
    expect(cockpitSource).toMatch(/onNote/)
    expect(cockpitSource).toMatch(/notesRef/)
  })

  it("focuses the visible draft note on Cmd+N without opening a duplicate editor", () => {
    expect(cockpitSource).toMatch(/setDraftNoteOpen\(true\)/)
    expect(cockpitSource).toMatch(/requestAnimationFrame/)
    expect(cockpitSource).toMatch(/notesRef\.current\?\.focus\(\)/)
    expect(cockpitSource).not.toMatch(/ClinicalNotesEditor/)
  })

  it("does not render a second reason-for-visit or prescribing handoff block", () => {
    expect(cockpitSource).not.toMatch(/reasonForVisitText/)
    expect(requestInfoSource).toMatch(/hidePrescriptionIntent/)
    expect(requestInfoSource).toMatch(/hidePatientStory/)
  })

  it("leaves patient safety context to the fixed panel header", () => {
    expect(cockpitSource).not.toMatch(/PatientDecisionStrip/)
    expect(cockpitSource).not.toMatch(/showDecisionStrip/)
    expect(cockpitSource).not.toMatch(/revealIdentityByDefault/)
  })

  it("opens Parchment from the prescribing shortcut instead of approving first", () => {
    expect(cockpitSource).toContain("review.handleOpenParchmentPrescribe()")
    expect(cockpitSource).not.toContain("review.handleApproveAndOpenParchment")
    expect(cockpitSource).not.toContain('review.handleStatusChange("awaiting_script")')
  })
})
