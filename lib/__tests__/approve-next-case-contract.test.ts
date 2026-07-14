import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const reviewActionsSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review-actions.tsx"),
  "utf-8",
)

const queueClientSource = readFileSync(
  resolve(process.cwd(), "app/doctor/queue/queue-client.tsx"),
  "utf-8",
)

const intakeDetailClientSource = readFileSync(
  resolve(process.cwd(), "app/doctor/intakes/[id]/intake-detail-client.tsx"),
  "utf-8",
)

describe("Approve + next case auto-advance contract", () => {
  it("review-actions emits advance:true on the action-complete callback so the consumer can open the next intake", () => {
    expect(reviewActionsSource).toMatch(/onActionComplete\(\{[^}]*advance:\s*true/)
  })

  it("queue-client opens the next intake from the queue when the action handler advances", () => {
    expect(queueClientSource).toMatch(/options\?\.advance !== false/)
    expect(queueClientSource).toMatch(/openReviewPanel\(nextIntake\.id\)/)
  })

  it("intake-detail-client navigates to the nextIntakeId href when the action handler advances", () => {
    expect(intakeDetailClientSource).toMatch(/options\?\.advance/)
    expect(intakeDetailClientSource).toMatch(/buildDoctorIntakeHref\(nextIntakeId\)/)
  })

  it("the parchment handoff path never fires action-complete, so opening it cannot skip a case", () => {
    expect(reviewActionsSource).not.toMatch(/onActionComplete\?\.\(\{[^}]*advance:\s*false/)
    expect(reviewActionsSource).toContain("onIntakeRefresh={reloadReviewData}")
  })
})
