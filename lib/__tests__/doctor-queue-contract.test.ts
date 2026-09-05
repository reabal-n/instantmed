import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const queriesSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/queries.ts"),
  "utf8",
)

/**
 * End of the `getDoctorQueue` body: the next top-level `export` after it.
 *
 * These tests used to slice to a literal `"export interface
 * PendingBatchReviewResult"` marker. #428 deleted that interface, so `indexOf`
 * returned -1 and `slice(start, -1)` silently widened the block to the whole
 * rest of the file — the positive assertions could then match text belonging to
 * other functions, and the `not.toContain` PHI-search assertions were scanning
 * far more than the queue. Anchoring on structure instead of a named neighbour
 * means deleting any single export can no longer silently unscope this.
 */
function doctorQueueBlockEnd(queueStart: number): number {
  const nextExport = /^export (?:async function|function|interface|type|const) /m
  const rest = queriesSource.slice(queueStart + 1)
  const match = rest.match(nextExport)
  if (!match || match.index === undefined) {
    throw new Error("Could not find the end of getDoctorQueue — update doctorQueueBlockEnd()")
  }
  return queueStart + 1 + match.index
}

const realtimeSource = readFileSync(
  join(process.cwd(), "lib/doctor/use-queue-realtime.ts"),
  "utf8",
)

const doctorShellSource = readFileSync(
  join(process.cwd(), "app/doctor/doctor-shell.tsx"),
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
const queueFiltersSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-filters.tsx"),
  "utf8",
)
const queueTableSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-table.tsx"),
  "utf8",
)
const queueClinicalStatusBadgesSource = readFileSync(
  join(process.cwd(), "components/doctor/queue-clinical-status-badges.tsx"),
  "utf8",
)
const queueUtilsSource = readFileSync(
  join(process.cwd(), "lib/doctor/queue-utils.ts"),
  "utf8",
)
const queueEmptyStateSource = readFileSync(
  join(process.cwd(), "lib/doctor/queue-empty-state.ts"),
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
const reviewDataHookSource = readFileSync(
  join(process.cwd(), "components/doctor/hooks/use-review-data.ts"),
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
const queueSearchActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/search-actions.ts"),
  "utf8",
)
const reviewActionsSource = readFileSync(
  join(process.cwd(), "components/doctor/review-actions.tsx"),
  "utf8",
)
const dashboardKeyboardSafetyE2ESource = readFileSync(
  join(process.cwd(), "e2e/dashboard.keyboard-safety.spec.ts"),
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

function queueActionBody(name: string): string {
  const start = queueActionsSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)
  const nextExport = queueActionsSource.indexOf("\nexport async function ", start + 1)
  return queueActionsSource.slice(start, nextExport === -1 ? queueActionsSource.length : nextExport)
}

const e2eResetMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501124500_harden_e2e_intake_reset.sql"),
  "utf8",
)

describe("doctor queue production contract", () => {
  it("keeps the server queue aligned with all fulfilment-entitled payment statuses", () => {
    expect(queriesSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queriesSource).toContain('.in("payment_status", [...FULFILMENT_ENTITLED_PAYMENT_STATUSES])')
  })

  it("keeps seeded E2E intakes out of live operational queue reads", () => {
    expect(queriesSource).toContain("filterSeededE2EIntakes")
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

  it("keeps new-request paging in Telegram instead of duplicating it in the dashboard", () => {
    expect(existsSync(join(process.cwd(), "components/doctor/intake-notification-listener.tsx"))).toBe(false)
    expect(doctorShellSource).not.toContain("IntakeNotificationListener")
    expect(doctorShellSource).not.toContain("useAuth")
    expect(realtimeSource).toContain("Telegram is the canonical channel")
    expect(realtimeSource).not.toContain("queue-sound-muted")
    expect(queueClientSource).toContain("applyQueueRealtimeUpdate")
    expect(queueClientSource).toContain("if (!reconciled.matched)")
    expect(queueClientSource).toContain("const reconcileRealtimeQueue = useCallback")
    expect(queueClientSource).toContain(
      "refreshQueue({ allowWhilePanelOpen: true, bypassThrottle: true })",
    )
    expect(queueClientSource).toContain("onRefreshRequested: reconcileRealtimeQueue")
    expect(dashboardKeyboardSafetyE2ESource).toContain("hasIsolatedRealtimeProject()")
    expect(dashboardKeyboardSafetyE2ESource).toContain("PRODUCTION_SUPABASE_PROJECT_REF")
    expect(dashboardKeyboardSafetyE2ESource).toContain("process.env.SUPABASE_URL")
    expect(dashboardKeyboardSafetyE2ESource).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL")
    expect(dashboardKeyboardSafetyE2ESource).toContain("new Set(projectRefs).size !== 1")
  })

  it("keeps queue refreshes throttled and runs a refresh after successful decisions", () => {
    expect(queueClientSource).toContain("lastQueueRefreshAtRef")
    // The blanket safety poll now fires only when realtime has fallen behind
    // (isStaleRef), at a 3min backstop (was an unconditional 45s full re-render).
    expect(queueClientSource).toContain("isStaleRef.current")
    expect(queueClientSource).toContain("}, 180000)")
    expect(queueClientSource).toContain("refreshQueue({ force: true })")
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
    expect(beforeDesktopReturn).toContain("await selectReviewedIntake(intakeId)")
    expect(queueClientSource).toContain("beforeReviewLeaveRef.current()")
    expect(queueTableSource).toContain("onPointerDown={(event)")
    expect(queueTableSource).toContain("if (event.detail === 0) openCaseFromPrimaryAction()")
  })

  it("treats the desktop inline review as open for refresh, but not for the keyboard gate", () => {
    // Refresh suppression counts the desktop two-pane inline selection so a
    // focus/visibility refresh can't remount the queue and clear the review.
    expect(queueClientSource).toContain("compactShell && isDesktop && Boolean(expandedId)")
    expect(queueClientSource).toContain("panelOpenRef.current = true")
    expect(queueClientSource).not.toContain("panelOpenRef.current = false")
    // ...but the keyboard gate keys off a real slide-over only (its own ref), so
    // inline j/k/Enter/a/d/Escape keep working once a case is selected — gating
    // the keyboard on the inline selection killed nav after the first keypress.
    expect(queueClientSource).toContain("slideOverOpenRef")
    expect(queueClientSource).toContain("if (slideOverOpenRef.current) return")
  })

  it("keeps queue hover visual-only so clinical review data loads only after explicit open", () => {
    expect(existsSync(join(process.cwd(), "components/doctor/queue/queue-row-peek.tsx"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/doctor/review-data-cache.ts"))).toBe(false)
    expect(queueTableSource).not.toContain("onMouseEnter")
    expect(queueTableSource).not.toContain("prefetchReviewData")
    expect(intakeReviewPanelSource).toContain("useReviewData")
    expect(reviewDataHookSource).toContain("fetch(`/api/doctor/intakes/${intakeId}/review-data`,")
    expect(intakeReviewPanelSource).toContain("does not prefetch PHI-heavy review payloads")
  })

  it("applies status filters before database pagination through a server navigation", () => {
    expect(queriesSource).toContain("getQueueStatusesForFilter")
    expect(queriesSource).toContain("statusFilter")
    expect(queueClientSource).toContain("router.replace")
    expect(queueClientSource).not.toContain("window.history.replaceState")
  })

  it("keeps global queue pressure counts scoped and fail-closed", () => {
    const countsStart = queriesSource.indexOf("const buildStatusCountsPromise")
    const countsEnd = queriesSource.indexOf("let oldestQuery", countsStart)
    const countsBlock = queriesSource.slice(countsStart, countsEnd)

    expect(countsStart).toBeGreaterThan(-1)
    expect(countsEnd).toBeGreaterThan(countsStart)
    expect(countsBlock).toContain('["all", "review", "pending_info", "scripts"]')
    expect(countsBlock).toContain("getQueueStatusesForFilter(filter)")
    expect(countsBlock).toContain("if (scope.serviceFilter) query = query.or(scope.serviceFilter)")
    expect(countsBlock).toContain("if (onlySeeded) query = query.eq")
    expect(countsBlock).toContain("then(resolveQueueStatusCounts)")
    expect(countsBlock).not.toContain("activeStatuses")
    expect(countsBlock).toContain("const globalStatusCountsPromise = buildStatusCountsPromise(null)")
    expect(countsBlock).toContain("? buildStatusCountsPromise(searchOr)")
  })

  it("applies the authoritative queue search predicate before count, status, and page range", () => {
    const queueStart = queriesSource.indexOf("export async function getDoctorQueue")
    const queueEnd = doctorQueueBlockEnd(queueStart)
    const queueBlock = queriesSource.slice(queueStart, queueEnd)
    const dataStart = queueBlock.indexOf("let dataQuery")
    const searchOnData = queueBlock.indexOf("dataQuery = dataQuery.or(searchOr)", dataStart)
    const pageRange = queueBlock.indexOf(".range(offset, offset + pageSize - 1)", dataStart)

    expect(queriesSource).toContain('const DOCTOR_QUEUE_PATIENT_SEARCH_FIELDS = ["full_name", "email"]')
    expect(queueBlock).toContain("sanitizeQueueSearchQuery(options?.q)")
    expect(queueBlock).toContain("buildAdminLedgerSearchOr(searchTerm, matchingPatientIds)")
    expect(queueBlock).toContain("if (searchOr) {\n        query = query.or(searchOr)")
    expect(queueBlock).toContain("if (searchPredicate) query = query.or(searchPredicate)")
    expect(searchOnData).toBeGreaterThan(dataStart)
    expect(pageRange).toBeGreaterThan(searchOnData)
    expect(queueBlock).not.toContain("medicare_number.ilike")
    expect(queueBlock).not.toContain("phone.ilike")
  })

  it("never presents a degraded page-length fallback as the authoritative search total", () => {
    const queueStart = queriesSource.indexOf("export async function getDoctorQueue")
    const queueEnd = doctorQueueBlockEnd(queueStart)
    const queueBlock = queriesSource.slice(queueStart, queueEnd)

    expect(queueBlock).toContain("const searchMatchCount = searchTerm")
    expect(queueBlock).toContain("&& !countResult.degraded")
    expect(queueBlock).toContain("&& !scope.degraded")
    expect(queueClientSource).toContain("visibleSearchMatchCount === 1")
    expect(queueClientSource).not.toContain("pagination?.total === 1")
    expect(queueClientSource).toContain("searchMatchCount={committedSearchQuery && visibleSearchState === \"ready\" ? visibleSearchMatchCount : null}")
  })

  it("exposes queue search in the compact cockpit without page-local filtering", () => {
    expect(queueFiltersSource).toContain('aria-label="Search active requests"')
    expect(queueClientSource).toContain("const filteredIntakes = sortedIntakes")
    expect(queueClientSource).toContain("sanitizeQueueSearchQuery(debouncedSearch)")
  })

  it("keeps patient search terms in memory and transports them through an authenticated POST action", () => {
    expect(queueClientSource).toContain("searchDoctorQueueAction")
    expect(queueClientSource).toContain("searchRequestSequenceRef")
    expect(queueClientSource).toContain("desiredSearchIntentRef")
    expect(queueClientSource).toContain("sequence !== searchRequestSequenceRef.current")
    expect(queueClientSource).not.toContain('params.set("q"')
    expect(queueTableSource).toContain("onPageChange?: (page: number) => void")
    expect(realtimeSource).toContain("onRefreshRequested")

    expect(queueSearchActionsSource).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(queueSearchActionsSource).toContain("checkServerActionRateLimit")
    expect(queueSearchActionsSource).toContain("doctorId: profile.id")
    expect(queueSearchActionsSource).toContain("hasAdminAccess(profile)")
    const inputContract = queueSearchActionsSource.slice(
      queueSearchActionsSource.indexOf("interface SearchDoctorQueueInput"),
      queueSearchActionsSource.indexOf("export type SearchDoctorQueueResult"),
    )
    expect(inputContract).not.toContain("doctorId")

    const refreshContract = queueClientSource.slice(
      queueClientSource.indexOf("const refreshQueue = useCallback"),
      queueClientSource.indexOf("useEffect(() => {\n    lastQueueRefreshAtRef.current"),
    )
    expect(refreshContract).toContain("desiredSearchIntentRef.current")
    expect(refreshContract).toContain(
      "!allowWhilePanelOpen && panelOpenRef.current && !desiredSearch",
    )
    expect(refreshContract).not.toContain("activeSearchViewRef.current")
    expect(queueClientSource).toContain(
      "completion.forceRefresh || Boolean(desiredSearchIntentRef.current)",
    )
  })

  it("keeps primary mobile queue controls at least 44px tall", () => {
    expect(queueFiltersSource).toContain("h-11 shrink-0")
    expect(queueFiltersSource).toContain("h-11 w-11")
    expect(queueFiltersSource).toContain("min-h-11 min-w-0")
    expect(queueFiltersSource).toContain("[&_input]:text-base")
    expect(queueFiltersSource).toContain("sm:[&_input]:text-sm")
    expect(queueFiltersSource).toContain("h-8 w-8 shrink-0")
    expect(queueTableSource).toContain("h-11 w-11")
    expect(queueTableSource).toContain("sm:h-8 sm:w-8")
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
    expect(queueEmptyStateSource).toContain("Queue data unavailable")
    expect(queueEmptyStateSource).toContain("This queue page is empty")
    expect(queueEmptyStateSource).toContain("Availability is paused")
    expect(queueEmptyStateSource).toContain("No matches for this filter")
    expect(queueEmptyStateSource).toContain("No review cases right now")
    expect(queueClientSource).toContain("doctorAvailable = true")
    expect(queueTableSource).toContain("emptyState")
    expect(queueTableSource).toContain("emptyState.actionHref")
    expect(queueTableSource).not.toContain("Queue is clear!")
  })

  it("keeps compact dashboard queue copy and chips decision-focused", () => {
    expect(queueClientSource).not.toContain("completed today.")
    expect(queueClientSource).toContain("Next up")
    expect(queueClientSource).not.toContain("No cases finished yet. First one's queued.")
    expect(queueClientSource).not.toContain("You're ${targetUsedPercent}% into the 2h target.")
    expect(queueClientSource).toContain("compactShell && isDesktop && filteredIntakes.length > 0")
    expect(queueClientSource).toContain("data-compact-caught-up")
    expect(queueClientSource).toContain("compactShell && filteredIntakes.length === 0")

    expect(queueTableSource).toContain("data-queue-taxonomy-chip")
    expect(queueTableSource).toContain("data-queue-action-chip")
    expect(queueTableSource).toContain("resolveStaffCaseActionLabel")
    expect(queueTableSource).toContain("Next action:")
    expect(queueTableSource).toContain("compactTaxonomyChipClass")
  })

  it("labels the recommended next case without claiming it is always the oldest", () => {
    expect(queueClientSource).toContain('const nextCaseLabel = filteredCount > 0\n      ? "Select the next case."')
    expect(queueClientSource).not.toContain("Select the oldest case.")
  })

  it("keeps compact rows to one action-led state and one service taxonomy", () => {
    expect(queueTableSource).toContain("const showRoutineStatus = !compactShell")
    expect(queueTableSource).not.toContain("getCompactQueueReason")
    expect(queueTableSource).not.toContain("compactQueueReason")
  })

  it("shows both the current doctor's and another doctor's active review claims", () => {
    expect(queueTableSource).toContain("{claimedByOther && (")
    expect(queueTableSource).toContain("{claimedByMe && (")
    expect(queueTableSource).not.toContain("{claimedByMe && !compactShell && (")
    expect(queueTableSource).toContain("Reviewing: you")
  })

  it("adds target context only for warning and critical waits", () => {
    expect(queueTableSource).toContain("const waitTargetState = getWaitTargetState(queueEnteredAt)")
    expect(queueTableSource).toContain('waitTargetState.tone !== "normal"')
    expect(queueUtilsSource).toContain("`${formatMinutes(Math.abs(deltaMinutes))} to target`")
    expect(queueUtilsSource).toContain("`${formatMinutes(deltaMinutes)} over target`")
    expect(queueUtilsSource).not.toContain('label: "At risk"')
  })

  it("keeps row wait labels minute-granular after the first minute", () => {
    const stableWaitStart = queueClientSource.indexOf("const calculateStableWaitTime")
    const stableWaitEnd = queueClientSource.indexOf("const getStableWaitTimeSeverity", stableWaitStart)
    const stableWaitBlock = queueClientSource.slice(stableWaitStart, stableWaitEnd)

    expect(stableWaitStart).toBeGreaterThan(-1)
    expect(stableWaitEnd).toBeGreaterThan(stableWaitStart)
    expect(stableWaitBlock).toContain("calculateLiveWaitTime(createdAt, clockNow)")
    expect(stableWaitBlock).not.toContain("afterFirstMinuteSecondsCadence")
    expect(queueClientSource).not.toContain("QUEUE_VISIBLE_WAIT_SECONDS_CADENCE")
    expect(queueClientSource).not.toContain("postMinuteCadenceMs:")
  })

  it("names the status filter group and documents A and D separately", () => {
    expect(queueFiltersSource).toContain('role="group"')
    expect(queueFiltersSource).toContain('aria-label="Filter queue by status"')
    expect(queueFiltersSource).toContain("Approve or open review")
    expect(queueFiltersSource).toContain("Open decline dialog")
    expect(queueFiltersSource).not.toContain("Review or decline")
  })

  it("keeps red queue chrome separate from doctor-attention flags", () => {
    expect(queueClientSource).toContain("hasQueueRiskBadge")
    expect(queueClientSource).not.toContain("hasReviewNextRisk")
    expect(queueTableSource).toContain("hasClinicalRisk(intake)")
    expect(queueClinicalStatusBadgesSource).toContain("High risk")
    expect(queueClinicalStatusBadgesSource).toContain("Needs call")
    expect(queueTableSource).toContain("requiresLiveConsult={intake.requires_live_consult === true}")
    expect(queueTableSource).toContain("compact={compactShell}")
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

  it("uses one live row wait signal with a useful shared target label", () => {
    expect(queueTableSource).toContain("getWaitTargetState(queueEnteredAt)")
    expect(queueTableSource).toContain("data-live-wait-counter")
    expect(queueTableSource).not.toContain("Over review target")
    expect(queueTableSource).not.toContain("isFulfilmentEntitledPaymentStatus(intake.payment_status)")
    expect(queueClientSource).toContain("getQueueClockTickDelayMs")
  })

  it("keeps compact queue controls explicit and confirms manual refreshes", () => {
    expect(queueFiltersSource).toContain('desktopLabel: "Needs review"')
    expect(queueFiltersSource).toContain('desktopLabel: "Needs info"')
    expect(queueFiltersSource).toContain('aria-label="Keyboard shortcuts"')
    expect(queueFiltersSource).toContain("Queue updated just now")
    expect(queueTableSource).toContain("Reviewing: you")
    expect(intakeReviewPanelSource).toContain("{!inline ? (")
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

  it("blocks repeat-Rx prescribing state changes without the raw unchanged-regimen attestation", () => {
    const updateStatusBody = queueActionBody("updateStatusAction")
    const quickPrescribeBody = queueActionBody("quickPrescribeRenewalAction")
    const markSentBody = queueActionBody("markScriptSentAction")
    const approveScriptBody = queueActionBody("approvePrescribedScriptAction")

    expect(queueActionsSource).toContain('from "@/lib/clinical/repeat-rx-attestation"')
    for (const body of [updateStatusBody, quickPrescribeBody, markSentBody, approveScriptBody]) {
      expect(body).toContain("getRepeatRxPrescribingBlocker(")
    }
    for (const body of [updateStatusBody, markSentBody, approveScriptBody]) {
      expect(body).toContain("isRepeatRxIntake(")
    }
    expect(quickPrescribeBody).toContain("isPrescribingServiceType(serviceType)")
    expect(updateStatusBody.indexOf("getRepeatRxPrescribingBlocker(")).toBeLessThan(
      updateStatusBody.indexOf("saveDoctorNotes(intakeId, decisionNote)"),
    )
    expect(quickPrescribeBody.indexOf("getRepeatRxPrescribingBlocker(answers)")).toBeLessThan(
      quickPrescribeBody.indexOf('.from("prescriptions")'),
    )
    expect(quickPrescribeBody).toContain("if (claimError || !claim?.success)")
    expect(quickPrescribeBody).toContain('select("claimed_by")')
    expect(quickPrescribeBody).toContain("claimedIntake?.claimed_by !== profile.id")
    expect(quickPrescribeBody).toContain("saveDoctorNotes(intakeId, renewalNote, profile.id)")
    expect(quickPrescribeBody).toContain("markAsReviewed(intakeId, profile.id, profile.id)")
    expect(quickPrescribeBody).toContain('updateIntakeStatus(intakeId, "awaiting_script", profile.id, profile.id)')
    expect(markSentBody.indexOf("getRepeatRxPrescribingBlocker(")).toBeLessThan(
      markSentBody.indexOf("updateScriptSent(intakeId, true"),
    )
    expect(markSentBody).toContain("intake.script_sent !== true")
    expect(approveScriptBody).toContain("intake.script_sent !== true")
    expect(approveScriptBody).toContain('code: "PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE"')
    expect(approveScriptBody).not.toContain("updateScriptSent(")
    expect(approveScriptBody).toContain("requireExistingNote: Boolean(regimenBlocker)")
    expect(queueActionsSource).toContain("Add and save a reconciliation note for the already-issued script")
    expect(queueActionsSource).toContain("hasLegacyRepeatRxReconciliationNote(existingNotes)")
    expect(queueActionsSource).toContain("Replace the decline/refund draft with a saved reconciliation note")
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
