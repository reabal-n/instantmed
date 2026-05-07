import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const queueSheetActionsSource = readFileSync(
  join(process.cwd(), "components/doctor/review/intake-action-buttons.tsx"),
  "utf8",
)

const fullCaseHeaderSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-header.tsx"),
  "utf8",
)

const queueTableSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-table.tsx"),
  "utf8",
)

describe("doctor review prescribing controls", () => {
  it("surfaces incomplete prescribing identity before queue-sheet approve and Parchment actions", () => {
    expect(queueSheetActionsSource).toContain("missingPrescribingIdentityFields")
    expect(queueSheetActionsSource).toContain("Complete patient identity")
  })

  it("surfaces incomplete prescribing identity before full-case approve and Parchment actions", () => {
    expect(fullCaseHeaderSource).toContain("missingPrescribingIdentityFields")
    expect(fullCaseHeaderSource).toContain("Complete patient identity")
  })

  it("exposes case-specific queue open controls for operator smoke tests and screen readers", () => {
    expect(queueTableSource).toContain("Open case for")
    expect(queueTableSource).toContain("intake.patient.full_name")
  })
})
