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

const reviewCockpitSource = readFileSync(
  join(process.cwd(), "components/doctor/review/intake-review-cockpit.tsx"),
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

const intakeReviewPanelSource = readFileSync(
  join(process.cwd(), "components/doctor/intake-review-panel.tsx"),
  "utf8",
)

const reviewDataHookSource = readFileSync(
  join(process.cwd(), "components/doctor/hooks/use-review-data.ts"),
  "utf8",
)

const parchmentPanelSource = readFileSync(
  join(process.cwd(), "components/doctor/parchment-prescribe-panel.tsx"),
  "utf8",
)

const queueActionSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/actions.ts"),
  "utf8",
)

describe("doctor review prescribing controls", () => {
  it("keeps prescribing as separate Prescribe then Complete request controls in the review rail", () => {
    expect(queueSheetActionsSource).not.toContain("Approve + Prescribe")
    expect(queueSheetActionsSource).not.toContain("handleApproveAndOpenParchment")
    expect(queueSheetActionsSource).not.toContain("parchmentOpened")
    expect(queueSheetActionsSource).toContain("handlePrescribeClick")
    expect(queueSheetActionsSource).toContain("handleApprovePrescribedScript")
    expect(queueSheetActionsSource).toContain("const canApproveAfterPrescribe = intake.script_sent === true")
    expect(queueSheetActionsSource).toContain('"Prescribe"')
    expect(queueSheetActionsSource).toContain("reviewPacket.workflow.completionLabel")
    expect(queueSheetActionsSource).toContain("Prescription recorded")
    expect(queueSheetActionsSource).not.toContain('"Complete Consultation"')
  })

  it("removes pre-send readiness and wait signals after durable prescription evidence", () => {
    expect(queueSheetActionsSource).toContain(
      "const hasRecordedPrescription = isPrescribingWorkflow && intake.script_sent === true",
    )
    expect(queueSheetActionsSource).toContain("const showPreSendSignals")
    expect(queueSheetActionsSource).toContain("!hasRecordedPrescription")
    expect(queueSheetActionsSource.match(/\{showPreSendSignals \? \(/g)).toHaveLength(2)
    expect(queueSheetActionsSource).toMatch(/const canDecline =\s*intake\.script_sent !== true/)
  })

  it("keeps every decline shortcut and dialog path closed after prescription fulfilment", () => {
    expect(reviewCockpitSource).toMatch(
      /onDecline: \(\) => \{[\s\S]*?intake\.script_sent === true[\s\S]*?setShowDeclineDialog\(true\)/,
    )
    expect(reviewActionsSource).toMatch(
      /onDecline: \(\) => \{[\s\S]*?intake\.script_sent !== true[\s\S]*?setShowDeclineDialog\(true\)/,
    )
    expect(reviewActionsSource).toContain(
      "if (!intake || intake.script_sent === true || !declineReason.trim()) return",
    )
    expect(reviewActionsSource).toContain(
      "showDeclineDialog: showDeclineDialog && intake?.script_sent !== true",
    )
  })

  it("keeps full-case prescribing approval gated on durable script-sent evidence only", () => {
    expect(fullCaseHeaderSource).not.toContain("parchmentOpened")
    expect(fullCaseHeaderSource).not.toContain("Boolean(intake.parchment_reference)")
    expect(fullCaseHeaderSource).toContain("const canApproveAfterPrescribe = intake.script_sent === true")
    expect(fullCaseHeaderSource).toContain("Prescription recorded")
    expect(fullCaseHeaderSource).toContain("Complete or record the prescription in Parchment first.")
    expect(fullCaseHeaderSource).toContain("full-case-prescribing-approve-hint")
    expect(fullCaseHeaderSource).toContain("canShowPrescribingCompletion")
    expect(fullCaseHeaderSource).toContain("canPrescribeInParchment && intake.script_sent !== true")
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

  it("shows prescribing consults as Prescribe plus the unified completion action", () => {
    expect(queueSheetActionsSource).toContain("canShowPrescribingCompletion")
    expect(queueSheetActionsSource).toContain("onClick={handleApprovePrescribedScript}")
    expect(queueSheetActionsSource).toContain("reviewPacket.workflow.completionLabel")
    expect(queueSheetActionsSource).not.toContain("\"Complete Consultation\"")
    expect(fullCaseHeaderSource).toContain("canShowPrescribingCompletion")
    expect(fullCaseHeaderSource).toContain("onClick={onApprovePrescribedScript}")
    expect(fullCaseHeaderSource).toContain("reviewPacket.workflow.completionLabel")
    expect(fullCaseHeaderSource).not.toContain("\"Complete Consultation\"")
  })

  it("refreshes only the selected review payload after prescribing", () => {
    expect(intakeReviewPanelSource).toContain("useReviewData")
    expect(intakeReviewPanelSource).toContain("reviewRevision")
    expect(reviewActionsSource).toContain("reloadReviewData")
    expect(reviewActionsSource).toContain("onIntakeRefresh={reloadReviewData}")
    expect(reviewActionsSource).not.toContain("onActionComplete?.({ advance: false })")
    expect(queueSheetActionsSource).toContain("await reloadReviewData")
    expect(queueSheetActionsSource).not.toContain("useRouter")
    expect(parchmentPanelSource).toContain("void onIntakeRefresh?.({ background: true })")
    expect(reviewDataHookSource).toContain("Prescription recorded — complete when ready")
    expect(reviewDataHookSource).toContain("announcedEvidenceRef")
    expect(reviewDataHookSource).toContain("if (background && dataRef.current)")
    expect(reviewDataHookSource).toContain("setRefreshError(message)")
    expect(reviewDataHookSource).not.toContain("setData(null)")
    expect(intakeReviewPanelSource).toContain("Showing the last confirmed request state.")
  })

  it("returns mobile prescribing to the same review and keeps the sheet usable at 375px", () => {
    expect(reviewActionsSource).toContain("const { activePanel, closePanel, openPanel } = usePanel()")
    expect(reviewActionsSource).toContain("onClose={activePanel ? () => openPanel(activePanel) : undefined}")
    expect(parchmentPanelSource).toContain("if (onClose) onClose()")
    expect(parchmentPanelSource).toContain("h-[100dvh] w-full")
    expect(parchmentPanelSource).toContain("sm:w-[min(800px,100vw)]")
    expect(parchmentPanelSource).toContain("pb-[max(0.75rem,env(safe-area-inset-bottom))]")
    expect(parchmentPanelSource).toContain('data-parchment-medication-context="compact"')
    expect(parchmentPanelSource).toContain("Request details")
    expect(parchmentPanelSource).toContain("min-h-11")
    expect(queueSheetActionsSource).toMatch(
      /onClick=\{handlePrescribeClick\}[\s\S]*?className="min-h-11[^"]*sm:h-7/,
    )
    expect(queueSheetActionsSource).toMatch(
      /onClick=\{handleApprovePrescribedScript\}[\s\S]*?className="min-h-11[^"]*sm:h-7/,
    )
  })

  it("keeps Complete request visible but disabled until Parchment evidence is durable", () => {
    expect(queueSheetActionsSource).toContain("const canApproveAfterPrescribe = intake.script_sent === true")
    expect(queueSheetActionsSource).toContain("!canApproveAfterPrescribe")
    expect(queueSheetActionsSource).toContain("disabled={isActionDisabled || Boolean(completionDisabledReason)}")
    expect(queueSheetActionsSource).toContain("Complete or record the prescription in Parchment first.")
    expect(parchmentPanelSource).toContain("Confirmation unlocks Complete request automatically")
  })

  it("requires durable fulfilment evidence at the server action boundary", () => {
    const actionStart = queueActionSource.indexOf("export async function approvePrescribedScriptAction")
    const actionEnd = queueActionSource.indexOf("export async function claimIntakeAction", actionStart)
    const actionBody = queueActionSource.slice(actionStart, actionEnd)

    expect(actionBody).toContain('code: "PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE"')
    expect(actionBody).toContain("intake.script_sent !== true")
    expect(actionBody).not.toContain("updateScriptSent(")
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

  it("gates Prescribe/Complete behind the canonical review-packet blocker on both surfaces", () => {
    for (const source of [queueSheetActionsSource, fullCaseHeaderSource]) {
      expect(source).toContain("buildReviewPacket")
      expect(source).toContain("getReviewPacketBlocker")
      expect(source).toContain("packetBlocker.blocked")
      expect(source).not.toContain("buildPrescribingPacket")
    }
  })

  it("surfaces the non-blocking packet warning visibly at the decision point on both surfaces", () => {
    // The review packet returns a non-blocking
    // warning (legacy repeat-Rx missing dose/indication WITH a clinical note) whose
    // message was previously surfaced only as a button tooltip — and the full-case
    // header renders no request packet, so it must remain visible there.
    // Both surfaces must now render the warning text visibly near the controls
    // (prescribingPacketWarning), in addition to the button title.
    for (const source of [queueSheetActionsSource, fullCaseHeaderSource]) {
      expect(source).toContain("packetBlocker.warning")
      expect(source).toContain("reviewPacketWarning")
      expect(source).toContain('data-testid="review-packet-warning"')
      // Tooltip nudge preserved too.
      expect(source).toContain("packetBlocker.message ??")
    }
  })
})
