import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const queueSheetActionsSource = readFileSync(
  join(process.cwd(), "components/doctor/review/intake-action-buttons.tsx"),
  "utf8",
)

const reviewActionsSource = readFileSync(
  join(process.cwd(), "components/doctor/review-actions.tsx"),
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

const queueClientSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-client.tsx"),
  "utf8",
)

describe("doctor review prescribing controls", () => {
  it("keeps prescribing as separate Prescribe then Approve controls in the review rail", () => {
    expect(queueSheetActionsSource).not.toContain("Approve + Prescribe")
    expect(queueSheetActionsSource).not.toContain("handleApproveAndOpenParchment")
    expect(queueSheetActionsSource).not.toContain("parchmentOpened")
    expect(queueSheetActionsSource).toContain("handlePrescribeClick")
    expect(queueSheetActionsSource).toContain("handleApprovePrescribedScript")
    expect(queueSheetActionsSource).toContain("const canApproveAfterPrescribe = intake.script_sent === true")
    expect(queueSheetActionsSource).toContain('"Prescribe"')
    expect(queueSheetActionsSource).toContain('"Approve"')
  })

  it("keeps full-case prescribing approval gated on durable script-sent evidence only", () => {
    expect(fullCaseHeaderSource).not.toContain("parchmentOpened")
    expect(fullCaseHeaderSource).not.toContain("Boolean(intake.parchment_reference)")
    expect(fullCaseHeaderSource).toContain("const canApproveAfterPrescribe = intake.script_sent === true")
    expect(fullCaseHeaderSource).toContain("Script sent")
    expect(fullCaseHeaderSource).toContain("Complete or record the prescription in Parchment first.")
    expect(fullCaseHeaderSource).toContain("full-case-prescribing-approve-hint")
    expect(fullCaseHeaderSource).toContain("{canPrescribeInParchment && (")
    expect(fullCaseHeaderSource).not.toContain("canPrescribeInParchment && onOpenParchmentPrescribe")
  })

  it("surfaces incomplete prescribing identity before queue-sheet approve and Parchment actions", () => {
    expect(queueSheetActionsSource).toContain("missingPrescribingIdentityFields")
    expect(queueSheetActionsSource).toContain("Complete patient identity")
  })

  it("keeps manual script evidence out of browser session storage", () => {
    expect(queueSheetActionsSource).not.toContain("sessionStorage")
    expect(queueSheetActionsSource).not.toContain("instantmed:manual-script-panel")
  })

  it("requires explicit manual script evidence before recording script_sent", () => {
    expect(queueSheetActionsSource).toContain("referenceInputRef.current?.value.trim()")
    expect(queueSheetActionsSource).toContain("reasonInputRef.current?.value.trim()")
    expect(queueSheetActionsSource).toContain("if (!externalReference && !reasonNote)")
    expect(queueSheetActionsSource).toContain("Reference or channel is required.")
  })

  it("keeps manual evidence dialog state local to the fallback control", () => {
    expect(queueSheetActionsSource).toContain("const [open, setOpen] = useState(false)")
    expect(reviewActionsSource).not.toContain("manualScriptPanelOpen")
    expect(reviewActionsSource).not.toContain("setManualScriptPanelOpen")
  })

  it("gives the inline manual script panel dialog-like keyboard and screen-reader semantics", () => {
    expect(queueSheetActionsSource).toContain('data-review-action-rail="true"')
    expect(queueSheetActionsSource).toContain("DialogContent")
    expect(queueSheetActionsSource).toContain("DialogTitle")
    expect(queueSheetActionsSource).toContain("Confirm sent outside Parchment")
    expect(queueSheetActionsSource).toContain('event.key === "Escape"')
  })

  it("surfaces incomplete prescribing identity before full-case approve and Parchment actions", () => {
    expect(fullCaseHeaderSource).toContain("missingPrescribingIdentityFields")
    expect(fullCaseHeaderSource).toContain("Complete patient identity")
  })

  it("uses email-aware prescription approval toast copy", () => {
    expect(reviewActionsSource).toContain("result.emailNotification === \"sent\"")
    expect(reviewActionsSource).toContain("Prescription approved and patient notified")
    expect(reviewActionsSource).toContain("Prescription approved. Patient notification needs follow-up.")

    const fullCaseActionSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/use-intake-actions.tsx"),
      "utf8",
    )
    expect(fullCaseActionSource).toContain("result.emailNotification === \"sent\"")
    expect(fullCaseActionSource).toContain("Prescription approved and patient notified")
    expect(fullCaseActionSource).toContain("Prescription approved. Patient notification needs follow-up.")
  })

  it("exposes case-specific queue open controls for operator smoke tests and screen readers", () => {
    expect(queueTableSource).toContain("Open case for")
    expect(queueTableSource).toContain("intake.patient.full_name")
  })

  it("routes ED and hair-loss prescribing consult quick actions through the review panel", () => {
    expect(queueClientSource).toContain("isQueuePrescribingConsult")
    expect(queueClientSource).toContain("subtype === \"ed\"")
    expect(queueClientSource).toContain("subtype === \"hair_loss\"")
    expect(queueClientSource).toContain("handleApprove(intake.id, service?.type, intake.subtype")
    expect(queueTableSource).toContain("isPrescribingConsult")
    expect(queueTableSource).toContain("? \"Prescribe\"")
    expect(queueTableSource).toContain("onApprove(intake.id, service?.type, intake.subtype)")
  })
})
