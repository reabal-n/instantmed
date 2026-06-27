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

  it("keeps manual script evidence values out of browser session storage", () => {
    expect(queueSheetActionsSource).toContain(
      'MANUAL_SCRIPT_PANEL_STORAGE_KEY = "instantmed:manual-script-panel-intake-id"',
    )
    expect(queueSheetActionsSource).not.toContain("sessionStorage.setItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY, externalReference")
    expect(queueSheetActionsSource).not.toContain("sessionStorage.setItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY, reasonNote")
    expect(queueSheetActionsSource).not.toContain("sessionStorage.setItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY, referenceInputRef")
    expect(queueSheetActionsSource).not.toContain("sessionStorage.setItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY, reasonInputRef")
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
    expect(queueSheetActionsSource).toContain('role="dialog"')
    expect(queueSheetActionsSource).toContain('aria-modal="false"')
    expect(queueSheetActionsSource).toContain("aria-labelledby={titleId}")
    expect(queueSheetActionsSource).toContain("MANUAL_SCRIPT_PANEL_STORAGE_KEY")
    expect(queueSheetActionsSource).toContain("sessionStorage.setItem")
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

  it("routes prescribing consult quick actions through the review panel", () => {
    expect(queueClientSource).toContain("isQueuePrescribingConsult")
    expect(queueClientSource).toContain("isPrescribingConsultSubtype(subtype)")
    expect(queueClientSource).toContain("handleApprove(intake.id, service?.type, intake.subtype")
    expect(queueTableSource).toContain("isPrescribingConsult")
    expect(queueTableSource).toContain("isPrescribingConsultSubtype(intake.subtype)")
    expect(queueTableSource).toContain("? \"Prescribe\"")
    expect(queueTableSource).toContain("onApprove(intake.id, service?.type, intake.subtype)")
  })

  it("shows prescribing consults as Prescribe plus Complete Consultation, not a generic approve pair", () => {
    expect(queueSheetActionsSource).toContain("shouldPrescribeFromConsult ? handleApprovePrescribedScript")
    expect(queueSheetActionsSource).toContain("\"Complete Consultation\"")
    expect(queueSheetActionsSource).toContain("!shouldPrescribeFromConsult ? (")
    expect(fullCaseHeaderSource).toContain("shouldPrescribeFromConsult && onApprovePrescribedScript")
    expect(fullCaseHeaderSource).toContain("\"Complete Consultation\"")
  })

  // Audit follow-up (2026-06-27): plan-06 bulleted the AI draft clinical note, but
  // the full-page action hook (use-intake-actions.tsx) carried a duplicate local
  // formatter that joined with " " (flowing sentences), so the full-page surface
  // never rendered bullets. It must use the single shared bulleted formatter.
  it("full-page draft note uses the shared bulleted formatter, not a local flowing-sentence copy", () => {
    const fullCaseActionSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/use-intake-actions.tsx"),
      "utf8",
    )
    expect(fullCaseActionSource).toContain('from "./intake-helpers"')
    expect(fullCaseActionSource).toContain("formatDraftAsNote")
    // No local re-definition of the formatter (the deduped one is imported).
    expect(fullCaseActionSource).not.toContain("function formatDraftAsNote")
    // intake-helpers delegates to the single shared bullet formatter (no re-impl).
    const helperSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/intake-helpers.ts"),
      "utf8",
    )
    expect(helperSource).toContain("formatClinicalNoteBullets")
    // The bullet rendering itself lives in the shared source of truth.
    const sharedSource = readFileSync(
      join(process.cwd(), "lib/doctor/clinical-notes.ts"),
      "utf8",
    )
    expect(sharedSource).toMatch(/`• \$\{piece\}`/)
    expect(sharedSource).toContain('.join("\\n")')
  })

  it("gates Prescribe/Complete behind the prescribing-packet blocker on both surfaces", () => {
    // Plan 06: a legacy repeat-Rx missing dose/indication (and no clinical note)
    // disables Prescribe + Complete via getPrescribingPacketBlocker, label
    // unchanged. Both review surfaces must wire it identically so one surface
    // can't silently drop the gate.
    for (const source of [queueSheetActionsSource, fullCaseHeaderSource]) {
      expect(source).toContain("buildPrescribingPacket")
      expect(source).toContain("getPrescribingPacketBlocker")
      expect(source).toContain("packetBlocker.blocked")
    }
  })

  it("surfaces the non-blocking packet warning visibly at the decision point on both surfaces", () => {
    // Codex review 2026-06-27: getPrescribingPacketBlocker returns a non-blocking
    // warning (legacy repeat-Rx missing dose/indication WITH a clinical note) whose
    // message was previously surfaced only as a button tooltip — and the full-case
    // header renders NO PrescribingPacketCard, so it was effectively invisible there.
    // Both surfaces must now render the warning text visibly near the controls
    // (prescribingPacketWarning), in addition to the button title.
    for (const source of [queueSheetActionsSource, fullCaseHeaderSource]) {
      expect(source).toContain("packetBlocker.warning")
      expect(source).toContain("prescribingPacketWarning")
      expect(source).toContain('data-testid="prescribing-packet-warning"')
      // Tooltip nudge preserved too.
      expect(source).toContain("packetBlocker.message ??")
    }
  })
})
