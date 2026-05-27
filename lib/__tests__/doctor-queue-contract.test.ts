import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const queriesSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/queries.ts"),
  "utf8",
)

const realtimeSource = readFileSync(
  join(process.cwd(), "lib/doctor/use-queue-realtime.ts"),
  "utf8",
)

const intakeNotificationListenerSource = readFileSync(
  join(process.cwd(), "components/doctor/intake-notification-listener.tsx"),
  "utf8",
)

const declineSource = readFileSync(
  join(process.cwd(), "app/actions/decline-intake.ts"),
  "utf8",
)

const queueClientSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-client.tsx"),
  "utf8",
)
const queueTableSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-table.tsx"),
  "utf8",
)
const queueFocusSource = readFileSync(
  join(process.cwd(), "lib/doctor/queue-focus.ts"),
  "utf8",
)
const intakeReviewPanelSource = readFileSync(
  join(process.cwd(), "components/doctor/intake-review-panel.tsx"),
  "utf8",
)
const intakeLockHookSource = readFileSync(
  join(process.cwd(), "components/doctor/hooks/use-intake-lock.ts"),
  "utf8",
)
const intakeDetailActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/use-intake-actions.tsx"),
  "utf8",
)
const intakeDetailClientSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-client.tsx"),
  "utf8",
)
const intakeDetailDraftsSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-drafts.tsx"),
  "utf8",
)

const queueTypesSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/types.ts"),
  "utf8",
)

const queueActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/actions.ts"),
  "utf8",
)
const reviewActionsSource = readFileSync(
  join(process.cwd(), "components/doctor/review-actions.tsx"),
  "utf8",
)

const caseActionGuardSource = readFileSync(
  join(process.cwd(), "lib/doctor/case-action-guard.ts"),
  "utf8",
)

const intakeLockSource = readFileSync(
  join(process.cwd(), "lib/data/intake-lock.ts"),
  "utf8",
)
const intakeLockStatusSource = readFileSync(
  join(process.cwd(), "lib/doctor/intake-lock-status.ts"),
  "utf8",
)

const requestMoreInfoSource = readFileSync(
  join(process.cwd(), "app/actions/request-more-info.ts"),
  "utf8",
)

const queueHealthSource = readFileSync(
  join(process.cwd(), "lib/monitoring/queue-health.ts"),
  "utf8",
)

const e2eResetMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501124500_harden_e2e_intake_reset.sql"),
  "utf8",
)

describe("doctor queue production contract", () => {
  it("keeps the server queue aligned with all actionable paid statuses", () => {
    expect(queriesSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queriesSource).toContain('.eq("payment_status", "paid")')
  })

  it("keeps seeded E2E intakes out of live operational queue reads", () => {
    expect(queriesSource).toContain("filterSeededE2EIntakes")
    expect(queueHealthSource).toContain("filterSeededE2EIntakes")
    expect(queueHealthSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queueHealthSource).not.toContain("mailinator.com")
  })

  it("keeps the E2E reset helper from leaving stale terminal timestamps", () => {
    expect(e2eResetMigrationSource).toContain("CREATE OR REPLACE FUNCTION public.e2e_reset_intake_status")
    expect(e2eResetMigrationSource).toContain("cancelled_at = CASE")
    expect(e2eResetMigrationSource).toContain("completed_at = CASE")
  })

  it("does not inject raw Supabase realtime INSERT rows into the hydrated queue list", () => {
    expect(realtimeSource).toContain("isHydratedQueueRealtimeInsert")
    expect(realtimeSource).toContain("router.refresh()")
  })

  it("keeps in-dashboard doctor toasts limited to fresh paid request transitions", () => {
    expect(intakeNotificationListenerSource).toContain("PAID_REQUEST_TOAST_WINDOW_MS")
    expect(intakeNotificationListenerSource).toContain("PAYMENT_WRITE_DRIFT_MS")
    expect(intakeNotificationListenerSource).toContain("isFreshPaidRequestNotification")
    expect(intakeNotificationListenerSource).toContain("if (!paidAt) return false")
    expect(intakeNotificationListenerSource).toContain('event: "UPDATE"')
    expect(intakeNotificationListenerSource).not.toContain('event: "INSERT"')
    expect(intakeNotificationListenerSource).not.toContain("payment completed")
    expect(intakeNotificationListenerSource).not.toContain("New request received")
  })

  it("keeps queue refreshes throttled and runs a refresh after successful decisions", () => {
    expect(queueClientSource).toContain("lastQueueRefreshAtRef")
    expect(queueClientSource).toContain("window.setInterval(refreshIfVisible, 45000)")
    expect(queueClientSource).toContain("refreshQueue(true)")
    expect(queueClientSource).toContain("onActionComplete={(options)")
    expect(queueClientSource).not.toContain("onActionComplete={(options) => {\n            router.refresh()")
    expect(reviewActionsSource).toContain("if (onActionComplete)")
    expect(reviewActionsSource).toContain("if (!onActionComplete) router.refresh()")
    // lastQueueRefreshLabel + setLastQueueRefreshAt + lastUpdatedLabel prop
    // were removed 2026-05-25 when the queue header's "updated 5:03pm"
    // chrome was deleted; the throttle ref is what actually enforces the
    // 5-second floor.
  })

  it("opens queue cases through one selection path so the Review button works on the first click", () => {
    expect(queueClientSource).not.toContain("onToggleExpand")
    expect(queueTableSource).not.toContain("onToggleExpand")

    const openHandlerStart = queueClientSource.indexOf("const openReviewPanel")
    const desktopReturnStart = queueClientSource.indexOf("if (compactShell && isDesktop)", openHandlerStart)
    const beforeDesktopReturn = queueClientSource.slice(openHandlerStart, desktopReturnStart)

    expect(openHandlerStart).toBeGreaterThan(-1)
    expect(desktopReturnStart).toBeGreaterThan(openHandlerStart)
    expect(beforeDesktopReturn).toContain("setExpandedId(intakeId)")
    expect(queueTableSource).toContain("onPointerDown={(event)")
    expect(queueTableSource).toContain("if (event.detail === 0) openCaseFromPrimaryAction()")
  })

  it("keeps queue hover visual-only so clinical review data loads only after explicit open", () => {
    expect(existsSync(join(process.cwd(), "components/doctor/queue/queue-row-peek.tsx"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/doctor/review-data-cache.ts"))).toBe(false)
    expect(queueTableSource).not.toContain("onMouseEnter")
    expect(queueTableSource).not.toContain("prefetchReviewData")
    expect(intakeReviewPanelSource).toContain("fetch(`/api/doctor/intakes/${intakeId}/review-data`,")
    expect(intakeReviewPanelSource).toContain("does not prefetch PHI-heavy review payloads")
  })

  it("keeps status filters local-first without forcing a server navigation", () => {
    expect(queueClientSource).toContain("window.history.replaceState")
    expect(queueClientSource).not.toContain("router.replace")
  })

  it("does not write patient email addresses into decline logs", () => {
    const logLines = declineSource
      .split("\n")
      .filter((line) => line.includes("logger.") && line.includes("patient.email"))

    expect(logLines).toEqual([])
  })

  it("does not select profile columns that are absent from the live schema", () => {
    expect(queriesSource).not.toContain("address_line2")
  })

  it("surfaces degraded queue reads instead of silently rendering an empty queue", () => {
    expect(queriesSource).toContain("degraded")
    expect(queueTypesSource).toContain("queueDegraded")
    expect(queueClientSource).toContain("Queue data may be incomplete")
  })

  it("explains why an embedded staff queue is empty instead of showing a generic success state", () => {
    expect(queueTypesSource).toContain("doctorAvailable?: boolean")
    expect(queueClientSource).toContain("buildQueueEmptyState")
    expect(queueClientSource).toContain("Availability is paused")
    expect(queueClientSource).toContain("No matches for this filter")
    expect(queueClientSource).toContain("No review cases right now")
    expect(queueClientSource).toContain("doctorAvailable = true")
    expect(queueTableSource).toContain("emptyState")
    expect(queueTableSource).toContain("emptyState.actionHref")
    expect(queueTableSource).not.toContain("Queue is clear!")
  })

  it("keeps queue health monitoring aligned with the paid doctor queue", () => {
    expect(queueHealthSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queueHealthSource).toContain('.in("status", QUEUE_REVIEW_STATUSES)')
    expect(queueHealthSource).toContain('.eq("payment_status", "paid")')
  })

  it("retires duplicate doctor decision APIs in favour of canonical server actions", () => {
    expect(existsSync(join(process.cwd(), "app/api/doctor/update-request/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/assign-request/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/bulk-action/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/drafts/[intakeId]/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/export/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/monitoring-stats/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/intakes/[id]/approve/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/stripe/refunds.ts"))).toBe(false)
    expect(queueActionsSource).toContain("declineIntakeCanonical")
    expect(queueActionsSource).not.toContain("refundIfEligible")
  })

  it("returns focus to the queue after the final detail-page action navigates back", () => {
    expect(intakeDetailActionsSource).toContain("DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY")
    expect(intakeDetailActionsSource).toContain("sessionStorage.setItem(DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY")
    expect(queueClientSource).toContain("DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY")
    expect(queueClientSource).toContain("queueRegionRef.current?.focus()")
    expect(queueClientSource).toContain('aria-label="Doctor request queue"')
  })

  it("warns before leaving full-page case review with unsaved clinical notes", () => {
    expect(intakeDetailActionsSource).toContain("lastSavedDoctorNotesRef")
    expect(intakeDetailActionsSource).toContain("noteDirty")
    expect(intakeDetailActionsSource).toContain("noteDirtyRef.current")
    expect(intakeDetailActionsSource).toContain("event.returnValue")
    expect(intakeDetailClientSource).toContain("noteDirty={actions.noteDirty}")
    expect(intakeDetailDraftsSource).toContain("Unsaved clinical notes")
  })

  it("autosaves full-page clinical notes and shows the last saved state", () => {
    expect(intakeDetailActionsSource).toContain("FULL_PAGE_NOTE_AUTOSAVE_MS")
    expect(intakeDetailActionsSource).toContain("autoSaveNotesTimerRef")
    expect(intakeDetailActionsSource).toContain("lastSavedDoctorNotesAt")
    expect(intakeDetailActionsSource).toContain("notesAutoSaving")
    expect(intakeDetailClientSource).toContain("lastSavedDoctorNotesAt={actions.lastSavedDoctorNotesAt}")
    expect(intakeDetailDraftsSource).toContain("Auto-saving")
    expect(intakeDetailDraftsSource).toContain("Last saved")
  })

  it("surfaces repeated clinical-note autosave failures inline with manual recovery", () => {
    expect(intakeDetailActionsSource).toContain("notesAutoSaveError")
    expect(intakeDetailActionsSource).toContain("autoSaveFailureCountRef")
    expect(intakeDetailActionsSource).toContain("setNotesAutoSaveError")
    expect(intakeDetailClientSource).toContain("notesAutoSaveError={actions.notesAutoSaveError}")
    expect(intakeDetailDraftsSource).toContain("Autosave is having trouble")
    expect(intakeDetailDraftsSource).toContain("Use Save Notes before approving")
  })

  it("remembers the last opened queue case after returning from detail", () => {
    expect(queueFocusSource).toContain("LAST_OPENED_DOCTOR_CASE_KEY")
    expect(queueClientSource).toContain("lastOpenedIntakeId")
    expect(queueClientSource).toContain("sessionStorage.getItem(LAST_OPENED_DOCTOR_CASE_KEY)")
    expect(queueTableSource).toContain("LAST_OPENED_DOCTOR_CASE_KEY")
    expect(queueTableSource).toContain("sessionStorage.setItem(LAST_OPENED_DOCTOR_CASE_KEY")
    expect(queueTableSource).toContain("Last opened")
  })

  it("visually marks paid queue cases that have passed the review target", () => {
    expect(queueTableSource).toContain("REVIEW_TARGET_MINUTES = 120")
    expect(queueTableSource).toContain("isPastReviewTarget")
    expect(queueTableSource).toContain("Over review target")
    expect(queueTableSource).toContain('intake.payment_status === "paid"')
  })

  it("keeps note guidance inline and avoids global 50-character blockers", () => {
    const detailHeaderSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-header.tsx"),
      "utf8",
    )
    const reviewButtonsSource = readFileSync(
      join(process.cwd(), "components/doctor/review/intake-action-buttons.tsx"),
      "utf8",
    )

    expect(detailHeaderSource).toContain("approveDisabledReason")
    expect(detailHeaderSource).toContain("approveDisabledReason")
    expect(detailHeaderSource).toContain("title={approveDisabledReason || undefined}")

    expect(reviewButtonsSource).toContain("approveDisabledReason")
    expect(reviewButtonsSource).toContain("isClinicalNoteSufficient")
    expect(reviewButtonsSource).toContain("Use the draft note or add a brief clinical note.")
    expect(reviewButtonsSource).toContain("approveDisabledReason || undefined")
    expect(reviewButtonsSource).not.toContain("50+ chars")
  })

  it("does not fail open when the doctor claim RPC is missing or unavailable", () => {
    expect(queueActionsSource).not.toContain("fallback to success")
    expect(queueActionsSource).not.toContain("return { success: true } // Graceful fallback")
    expect(queueActionsSource).not.toContain("return { success: true }\\n      }")
  })

  it("requires claimed case ownership before mutable doctor queue actions", () => {
    expect(queueActionsSource).toContain("ensureDoctorCaseActionAllowed")
    expect(caseActionGuardSource).toContain("Claim this case before taking action.")
  })

  it("uses the atomic claim RPC for panel lock acquisition", () => {
    expect(intakeLockSource).toContain('rpc("claim_intake_for_review"')
    expect(intakeLockSource).not.toContain("claimed_by: doctorId")
  })

  it("surfaces the active review claim inside the open case pane", () => {
    expect(intakeLockHookSource).toContain("lockState")
    expect(intakeReviewPanelSource).toContain("data-review-claim-state")
    expect(intakeReviewPanelSource).not.toContain("data-review-start-cta")
    expect(intakeReviewPanelSource).toContain("formatClaimAge")
    expect(intakeReviewPanelSource).toContain("You're reviewing")
    expect(intakeReviewPanelSource).not.toContain("Starting review")
    expect(intakeReviewPanelSource).toContain("visibleClaimStateLabel")
    expect(intakeReviewPanelSource).not.toContain("Review note")
    expect(queueClientSource).not.toContain("operator-release-review-case")
  })

  it("does not claim approved or terminal cases when opening read-only review", () => {
    expect(intakeReviewPanelSource).toContain("isReviewLockableStatus(data.intake.status)")
    expect(intakeLockStatusSource).toContain('"paid"')
    expect(intakeLockStatusSource).toContain('"awaiting_script"')
    expect(intakeLockStatusSource).not.toContain('"approved"')
    expect(intakeLockStatusSource).not.toContain('"completed"')
    expect(intakeLockStatusSource).not.toContain('"declined"')
  })

  it("requires case ownership before requesting more patient information", () => {
    expect(requestMoreInfoSource).toContain("getDoctorCaseActionError")
    expect(requestMoreInfoSource).toContain("claimed_by")
    expect(requestMoreInfoSource).toContain("reviewing_doctor_id")
  })

  it("blocks awaiting-script transitions when prescribing identity is incomplete", () => {
    expect(queueActionsSource).toContain("getParchmentPatientIdentityIssues")
    expect(queueActionsSource).toContain("Cannot approve for prescribing until patient identity is complete")
  })

  it("persists the generated case-summary draft when approving without typed notes", () => {
    expect(queueActionsSource).toContain("buildClinicalCaseSummary")
    expect(queueActionsSource).toContain("resolveClinicalDecisionNote")
    expect(queueActionsSource).toContain("saveDoctorNotes(intakeId, decisionNote)")
  })

  it("falls back to the case-summary draft when the formatted AI note is empty", () => {
    expect(intakeReviewPanelSource).toContain("const fallbackDraftNote = buildClinicalCaseSummary")
    expect(intakeReviewPanelSource).toContain("const resolvedDraftNote = formatted?.trim() ? formatted : fallbackDraftNote")
    expect(intakeReviewPanelSource).toContain("actions.setInitialNotes(resolvedDraftNote, resolvedDraftNote)")
  })
})
