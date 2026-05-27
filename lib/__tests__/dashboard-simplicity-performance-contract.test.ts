import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")
const collectSourceFiles = (dir: string): string[] => {
  const absoluteDir = join(root, dir)
  const entries = readdirSync(absoluteDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = `${dir}/${entry.name}`

    if (entry.isDirectory()) return collectSourceFiles(relativePath)
    if (!/\.(ts|tsx)$/.test(entry.name)) return []

    return [relativePath]
  })
}

describe("dashboard simplicity and runtime performance contracts", () => {
  it("keeps the patient app shell free of decorative page-transition runtime", () => {
    const source = read("app/patient/patient-shell.tsx")

    expect(source).not.toContain("framer-motion")
    expect(source).not.toContain("AnimatePresence")
    expect(source).not.toContain("motion.div")
  })

  it("keeps the patient dashboard scannable without scroll-triggered animation wrappers", () => {
    const source = read("components/patient/panel-dashboard.tsx")

    expect(source).not.toContain("framer-motion")
    expect(source).not.toContain("whileInView")
    expect(source).not.toContain("stagger.")
    expect(source).toContain("next/dynamic")
    expect(source).toContain("profile-drawers")
    expect(source).toContain("patient/intake-detail-drawer")
    expect(source).toContain("patient/referral-card")
  })

  it("keeps patient routes off the broad patient component barrel", () => {
    expect(existsSync(join(root, "components/patient/index.ts"))).toBe(false)

    const patientRouteSources = [
      "app/patient/page.tsx",
      "app/patient/intakes/intakes-client.tsx",
      "app/patient/intakes/[id]/client.tsx",
      "app/patient/prescriptions/client.tsx",
      "app/patient/documents/documents-client.tsx",
      "app/patient/messages/messages-client.tsx",
    ]

    for (const file of patientRouteSources) {
      expect(read(file)).not.toContain('from "@/components/patient"')
    }
  })

  it("keeps profile housekeeping static and defers drawer forms until opened", () => {
    const todoSource = read("components/patient/profile-todo-card.tsx")
    const drawerSource = read("components/patient/profile-drawers.tsx")
    const panelDashboardSource = read("components/patient/panel-dashboard.tsx")

    expect(todoSource).not.toContain("framer-motion")
    expect(todoSource).not.toContain("AnimatePresence")
    expect(drawerSource).not.toContain("framer-motion")
    expect(drawerSource).toContain("@/components/panels/panel-provider")
    expect(panelDashboardSource).toContain("import(\"@/components/panels/drawer-panel\")")
  })

  it("keeps the default panel provider out of the Framer Motion bundle path", () => {
    const providerSource = read("components/panels/panel-provider.tsx")
    const patientShellSource = read("app/patient/patient-shell.tsx")

    expect(providerSource).not.toContain("framer-motion")
    expect(providerSource).not.toContain("AnimatePresence")
    expect(patientShellSource).toContain("@/components/panels/panel-provider")
    expect(patientShellSource).toContain("@/components/shell/left-rail")
    expect(patientShellSource).not.toContain("@/components/shell'")
    expect(existsSync(join(root, "components/shell/authenticated-shell.tsx"))).toBe(false)
  })

  it("avoids high-frequency whole-queue redraws in the staff cockpit", () => {
    const source = read("app/doctor/queue/queue-client.tsx")

    expect(source).toContain("}, 60000)")
    expect(source).toContain("if (intakes.length === 0)")
    expect(source).not.toContain("}, 30000)")
  })

  it("keeps staff queue DOM rows windowed at the scale boundary", () => {
    const source = read("app/doctor/queue/queue-table.tsx")

    expect(source).toContain("QUEUE_DOM_WINDOW_LIMIT = 100")
    expect(source).toContain("filteredIntakes.slice(0, QUEUE_DOM_WINDOW_LIMIT)")
    expect(source).toContain("renderedIntakes.map")
  })

  it("keeps queue hover from fetching full clinical review payloads", () => {
    expect(existsSync(join(root, "components/doctor/queue/queue-row-peek.tsx"))).toBe(false)
    expect(existsSync(join(root, "lib/doctor/review-data-cache.ts"))).toBe(false)

    const source = read("app/doctor/queue/queue-table.tsx")
    expect(source).not.toContain("prefetchReviewData")
    expect(source).not.toContain("onMouseEnter")
  })

  it("keeps the doctor queue header focused on current operational pressure", () => {
    const dashboardPageSource = read("app/dashboard/page.tsx")
    const queueClientSource = read("app/doctor/queue/queue-client.tsx")
    const queueFiltersSource = read("app/doctor/queue/queue-filters.tsx")
    const systemHealthSource = read("components/operator/system-health-pill.tsx")
    const queuePressureSource = read("components/operator/queue-pressure-signal.tsx")
    const queueTableSource = read("app/doctor/queue/queue-table.tsx")
    const userCardSource = read("components/uix/user-card.tsx")

    expect(dashboardPageSource).toContain("QueuePressureSignal")
    expect(dashboardPageSource).toContain("oldestWaitingMinutes")
    expect(dashboardPageSource).toContain("showIcon={false}")
    expect(dashboardPageSource).toContain("softenWhenReviewOpen")
    expect(dashboardPageSource).toContain("jumpToOldestOnClick")
    expect(dashboardPageSource).toContain("getFormToInboxStats")
    expect(queueClientSource).toContain("oldestWaitingMinutes")
    expect(queueClientSource).toContain("Oldest wait")
    expect(queueClientSource).toContain("root.dataset.operatorReviewingCase")
    expect(queueClientSource).toContain("operator-reviewing-case-change")
    expect(queueClientSource).toContain("operator-jump-to-oldest-wait")
    expect(queueClientSource).toContain("handleJumpToOldestWait")
    expect(queueClientSource).not.toContain("QueueSummaryStrip")
    expect(queueClientSource).toContain("medianDecisionMinutes")
    expect(queueClientSource).toContain("formToInboxStats")
    expect(queueClientSource).toContain("primeReviewPanelCode")
    expect(queueClientSource).not.toContain("QueueRunStatusStrip")
    expect(queueClientSource).toContain("showOldestWaiting={!compactShell}")
    expect(queueClientSource).not.toContain("queueContext={{")
    expect(queueClientSource).toContain("Needs first decision")
    expect(queueClientSource).toContain("Next step")
    expect(queueClientSource).not.toContain("Review oldest")
    expect(queueClientSource).toContain("const showNextUp = filteredCount > 0")
    expect(queueClientSource).toContain("{showNextUp ? (")
    expect(queueClientSource).not.toContain("visibleNextIntakes")
    expect(queueClientSource).toContain("nextIntakes={filteredIntakes.slice(0, 3)}")
    expect(queueClientSource).not.toContain("nextCaseButtonLabel")
    expect(queueClientSource).toContain("Target: oldest wait under 2h")
    expect(queueClientSource).not.toContain("grid grid-cols-3 gap-2")
    expect(queueClientSource).not.toContain(">Reviewed</p>")
    expect(queueClientSource).toContain("primaryMetricLabel")
    expect(queueClientSource).toContain("primaryMetricValue")
    expect(queueClientSource).not.toContain("Right now")
    expect(queueClientSource).not.toContain("Next decision")
    expect(queueClientSource).not.toContain("Queue is clear.")
    expect(queueClientSource).toContain("No reviews completed today.")
    expect(queueClientSource).toContain("Showing older queue data. Refresh to see new arrivals.")
    expect(queueClientSource).toContain('role="status"')
    expect(queueClientSource).not.toContain("useRelativeRefreshAge")
    expect(queueClientSource).not.toContain("Updated this minute")
    expect(queuePressureSource).toContain("data-queue-pressure")
    expect(queuePressureSource).toContain("data-queue-pressure-softened")
    expect(queuePressureSource).toContain("softenWhenReviewOpen")
    expect(queuePressureSource).toContain("jumpToOldestOnClick")
    expect(queuePressureSource).toContain("operator-jump-to-oldest-wait")
    expect(queuePressureSource).toContain("operator-reviewing-case-change")
    expect(queuePressureSource).toContain("Target: under 2h")
    expect(queuePressureSource).toContain("formatRefreshAge")
    expect(read("lib/doctor/queue-pressure.ts")).toContain("No one waiting")
    expect(queueClientSource).not.toContain("Open it from the row")
    expect(queueClientSource).not.toContain("One case waiting -")
    expect(queueClientSource).not.toContain("liveMedianMinutes")
    expect(queueFiltersSource).toContain("Oldest wait")
    expect(queueFiltersSource).toContain("showOldestWaiting")
    expect(queueFiltersSource).toContain("getQueuePressureState")
    expect(queueFiltersSource).toContain("onOpenSingleMatch")
    expect(queueFiltersSource).toContain('event.key !== "Enter"')
    expect(queueFiltersSource).toContain("data-queue-pressure")
    expect(queueFiltersSource).toContain("Today's queue")
    expect(queueFiltersSource).toContain("matchLabel")
    expect(queueFiltersSource).toContain("formToInboxStats")
    expect(queueFiltersSource).toContain("Form to inbox")
    expect(queueFiltersSource).toContain("target under 2h")
    expect(queueFiltersSource).toContain('aria-live="polite"')
    expect(queueTableSource).toContain("getPlainSearchHighlight")
    expect(queueTableSource).toContain("descriptionClassName={compactShell")
    expect(queueClientSource).toContain("searchQuery={debouncedSearch}")
    expect(userCardSource).toContain("highlightQuery")
    expect(userCardSource).toContain("descriptionClassName")
    expect(userCardSource).toContain("<mark")
    expect(systemHealthSource).toContain("dominantSystemHealthLabel")
    expect(systemHealthSource).toContain("email failure")
    expect(queueFiltersSource).toContain("count === 0")
    expect(queueFiltersSource).not.toContain("Median wait")
    expect(queueFiltersSource).not.toContain("Open next case")
  })

  it("keeps the form-to-inbox metric real-only and med-cert scoped", () => {
    const queriesSource = read("lib/data/intakes/queries.ts")
    const queueClientSource = read("app/doctor/queue/queue-client.tsx")

    expect(queriesSource).toContain("getFormToInboxStats")
    expect(queriesSource).toContain("DEFAULT_FORM_TO_INBOX_MIN_SAMPLE_SIZE = 3")
    expect(queriesSource).toContain('service?.type === "med_certs"')
    expect(queriesSource).toContain('intake.category === "medical_certificate"')
    expect(queriesSource).not.toContain("14-minute")
    expect(queueClientSource).toContain("formToInboxStats ?")
    expect(queueClientSource).toContain("Avg med cert today")
    expect(queueClientSource).toContain("Form to inbox. Target under 2h.")
    expect(queueClientSource).not.toContain("Median form-to-inbox")
  })

  it("keeps split-view loading and row chrome calm under interaction", () => {
    const queueClientSource = read("app/doctor/queue/queue-client.tsx")
    const queueTableSource = read("app/doctor/queue/queue-table.tsx")
    const reviewPanelSource = read("components/doctor/intake-review-panel.tsx")
    const operatorPageSource = read("components/operator/operator-page.tsx")

    expect(queueClientSource).toContain("bg-[#F1EFEA]/80")
    expect(queueClientSource).toContain('mode={expandedId ? "reviewing" : "idle"}')
    expect(operatorPageSource).toContain('mode?: "idle" | "reviewing" | "dense"')
    expect(operatorPageSource).toContain("cubic-bezier(0.16,1,0.3,1)")
    expect(operatorPageSource).not.toContain("transition-[grid-template-columns]")
    expect(queueTableSource).toContain("min-w-fit whitespace-nowrap")
    expect(queueTableSource).toContain("showInlineWaitTime")
    expect(queueTableSource).toContain("displayWaitLabel")
    expect(queueTableSource).toContain('waitLabel === "0m" ? "Just arrived"')
    expect(queueTableSource).toContain("sm:grid-cols-[minmax(0,1fr)_auto]")
    expect(queueTableSource).toContain("before:bg-primary")
    expect(queueTableSource).toContain("before:w-1")
    expect(queueTableSource).toContain("bg-primary/[0.04]")
    expect(queueTableSource).toContain("shadow-[inset_3px_0_0_hsl(var(--primary))]")
    expect(queueTableSource).toContain("Selected")
    expect(queueTableSource).toContain("No one else waiting · target under 2h")
    expect(queueTableSource).toContain("onPointerEnter={onPrimeReviewPanelCode}")
    expect(queueClientSource).toContain("data-review-pane-entry")
    expect(queueClientSource).toContain("review-pane-in_220ms")
    expect(queueClientSource).not.toContain("motion-safe:animate-[fade-in_150ms_ease-in-out]")
    expect(queueClientSource).not.toContain("fade-in-right_260ms")
    expect(queueTableSource).toContain("compactShell ? (")
    expect(queueTableSource).toContain("Follow-ups")
    expect(queueTableSource).not.toContain("No pending replies or scripts waiting")
    expect(queueTableSource).toContain("pending replies")
    expect(queueTableSource).toContain("scripts to write")
    expect(queueTableSource).not.toContain("getCompactNextActionLabel")
    expect(queueTableSource).not.toContain("prefetchReviewData")
    expect(queueTableSource).not.toContain("onMouseEnter")
    expect(reviewPanelSource).toContain("Pulling intake answers")
    expect(reviewPanelSource).toContain("Preparing review")
    expect(reviewPanelSource).toContain("Decision")
    expect(reviewPanelSource).toContain("Patient actions")
    expect(reviewPanelSource).toContain('inline ? "Profile" : "Patient profile"')
    expect(reviewPanelSource).toContain("formatPreviewAgeDob")
    expect(reviewPanelSource).toContain("formatPreviewLocation")
    expect(reviewPanelSource).toContain("Review details took too long to load")
    expect(reviewPanelSource).toContain("Retry")
    expect(reviewPanelSource).not.toContain("InlineQueueContextStrip")
    expect(reviewPanelSource).not.toContain("QueueContextSummary")
    expect(reviewPanelSource).not.toContain("fade-in-right_200ms")
    expect(reviewPanelSource).toContain("fade-in-up_200ms")
    expect(reviewPanelSource).not.toContain("Opening {previewIntake.patient.full_name}")
    expect(reviewPanelSource).toContain("Checks")
    expect(reviewPanelSource).toContain("Draft note")
    expect(reviewPanelSource).toContain("fallbackDraftNote")
    expect(reviewPanelSource).toContain("buildClinicalCaseSummary")
    expect(reviewPanelSource).not.toContain("notesRef.current?.focus({ preventScroll: true })")
    expect(reviewPanelSource).not.toContain("Intake answers")
    expect(reviewPanelSource).not.toContain("Prior scripts")
    expect(reviewPanelSource).toContain("bg-[#F1EFEA]/80")
    expect(reviewPanelSource).toContain("rounded-xl")
    expect(reviewPanelSource).not.toContain("bg-slate-200/70")
    expect(reviewPanelSource).not.toContain("Loading case details...")
  })

  it("keeps clinical action colours muted on the doctor surface", () => {
    const availabilityToggleSource = read("components/doctor/doctor-availability-toggle.tsx")
    const actionButtonsSource = read("components/doctor/review/intake-action-buttons.tsx")
    const dashboardLayoutSource = read("app/dashboard/layout.tsx")

    expect(availabilityToggleSource).toContain("#7B8F80")
    expect(availabilityToggleSource).toContain("#637A68")
    expect(availabilityToggleSource).toContain('size={compact ? "sm" : "default"}')
    expect(actionButtonsSource).toContain("#2563EB")
    expect(actionButtonsSource).toContain("transition-colors")
    expect(actionButtonsSource).toContain("Cmd+Enter")
    expect(actionButtonsSource).toContain("Cmd+Shift+D")
    expect(actionButtonsSource).toContain("data-shortcut-hint")
    expect(actionButtonsSource).toContain("Decline request · refund")
    expect(actionButtonsSource).toContain("Confirming decline issues the patient refund.")
    expect(actionButtonsSource).toContain("A decline refunds")
    expect(actionButtonsSource).toContain("to the patient.")
    expect(actionButtonsSource).toContain("ActionReadinessChecks")
    expect(actionButtonsSource).toContain("data-action-readiness")
    expect(actionButtonsSource).toContain("Ready to decide")
    expect(actionButtonsSource).toContain("Checks need attention")
    expect(actionButtonsSource).not.toContain("Pre-flight checks")
    expect(actionButtonsSource).toContain("data-action-rail-pinned")
    expect(actionButtonsSource).toContain("data-decline-lane")
    expect(actionButtonsSource).toContain("border-border/60")
    expect(actionButtonsSource).toContain('completeLabel: "Intake checked"')
    expect(actionButtonsSource).toContain('completeLabel: "No red flags"')
    expect(actionButtonsSource).toContain('completeLabel: "Draft note ready"')
    expect(actionButtonsSource).toContain("data-action-rail-outside-scroll")
    expect(actionButtonsSource).not.toContain('`${check.label} done`')
    expect(actionButtonsSource).toContain("h-7")
    expect(actionButtonsSource).toContain("text-destructive")
    expect(actionButtonsSource).toContain("text-destructive/85")
    expect(actionButtonsSource).toContain("hover:bg-transparent")
    expect(actionButtonsSource).toContain("sm:justify-end")
    expect(actionButtonsSource).toContain('variant="ghost"')
    expect(actionButtonsSource).not.toContain("text-white/70")
    expect(actionButtonsSource).not.toContain("text-destructive/70")
    expect(dashboardLayoutSource).toContain("Doctor console")
    expect(dashboardLayoutSource).toContain("Support console")
    expect(dashboardLayoutSource).toContain("Staff console")
    expect(actionButtonsSource).not.toContain("Patient is refunded automatically if you decline.")
    expect(actionButtonsSource).not.toContain("If you decline, we refund the patient and close the case")
    expect(actionButtonsSource).not.toContain("Patient is refunded and notified")
    expect(actionButtonsSource).not.toContain("Approve only when symptoms, dates, and certificate type are clinically consistent")
    expect(actionButtonsSource).not.toContain("Decline and we refund the patient automatically")
    expect(actionButtonsSource).not.toContain("Fees are automatically refunded if declined")
    expect(actionButtonsSource).not.toContain("We refund the fee if you decline")
    expect(actionButtonsSource).not.toContain("#B65F56")
    expect(read("lib/hooks/use-doctor-shortcuts.ts")).not.toContain('event.key === "a"')
    expect(actionButtonsSource).not.toContain("bg-emerald-600")
  })

  it("keeps the review pane decision controls visible before scrolling", () => {
    const cockpitSource = read("components/doctor/review/intake-review-cockpit.tsx")
    const actionSource = read("components/doctor/review/intake-action-buttons.tsx")
    const notesEditorSource = read("components/doctor/review/clinical-notes-editor.tsx")
    const clinicalCaseReviewSource = read("components/doctor/clinical-case-review.tsx")
    const requestInfoSource = read("components/doctor/review/request-info-card.tsx")

    expect(cockpitSource).toContain("requestMoreInfoAction")
    expect(cockpitSource).toContain("symptom_clarification")
    expect(cockpitSource).toContain("No symptoms yet. Ask the patient for detail.")
    expect(cockpitSource).toContain("onRequestClinicalDetail={handleRequestClinicalDetail}")
    expect(cockpitSource).toContain("showThinMedCertWarning")
    expect(cockpitSource).toContain("requiresClinicalDetail={canRequestClinicalDetail}")
    expect(cockpitSource).not.toContain("caseReadAcknowledged")
    expect(cockpitSource).not.toContain("onFocusCapture")
    expect(cockpitSource).not.toContain("const approvalReadRequired = isApprovalReviewState && !caseReadAcknowledged")
    expect(cockpitSource).not.toContain("if (hasThinMedCertIntake)")
    expect(cockpitSource).not.toContain("Ask for detail, or decline")
    expect(cockpitSource).not.toContain("No symptoms described. Request detail before issuing.")
    expect(cockpitSource).not.toContain("Sticky bottom: action bar")
    expect(actionSource).toContain('placement?: "top" | "bottom"')
    expect(actionSource).not.toContain("approvalReadRequired")
    expect(actionSource).toContain("requiresClinicalDetail")
    expect(actionSource).not.toContain("Review the case before approving.")
    expect(actionSource).not.toContain("Waiting on symptoms from the patient.")
    expect(actionSource).toContain("Approve and send")
    expect(actionSource).toContain('"Request symptoms"')
    expect(actionSource).toContain("Review and send")
    expect(actionSource).toContain("Symptoms missing; the next screen asks you to confirm before sending.")
    expect(actionSource).not.toContain("Request symptoms before approving.")
    expect(actionSource).not.toContain("Ask for symptoms first. Then you can approve.")
    expect(actionSource).not.toContain("border-amber-200")
    expect(actionSource).not.toContain("bg-amber-50")
    expect(actionSource).not.toContain("text-amber-800")
    expect(actionSource).not.toContain("Request detail")
    expect(actionSource).toContain("operator-action-rail")
    expect(actionSource).not.toContain("decisionGuidance")
    expect(actionSource).toContain("ActionReadinessChecks")
    expect(actionSource).toContain("data-action-readiness")
    expect(cockpitSource).toContain("data-review-body-transition")
    expect(cockpitSource).toContain("review-body-in_200ms")
    expect(notesEditorSource).toContain("isNoteFocused")
    expect(notesEditorSource).toContain("setIsNoteFocused(true)")
    expect(notesEditorSource).toContain("setIsNoteFocused(false)")
    expect(notesEditorSource).toContain("min-h-[320px]")
    expect(notesEditorSource).toContain("focus-within:shadow-sm")
    expect(clinicalCaseReviewSource).toContain("visibleFacts.length > 0")
    expect(clinicalCaseReviewSource).toContain('<details open className="rounded-lg bg-muted/30')
    expect(clinicalCaseReviewSource).toContain("Patient answers")
    expect(clinicalCaseReviewSource).not.toContain("What the patient told us")
    expect(clinicalCaseReviewSource).not.toContain("Patient-submitted facts")
    expect(clinicalCaseReviewSource).toContain("Clinical note")
    expect(clinicalCaseReviewSource).toContain("Pinned case facts")
    expect(clinicalCaseReviewSource).toContain("Pinned reason for visit")
    expect(clinicalCaseReviewSource).toContain("summary.patientStory")
    expect(clinicalCaseReviewSource).toContain("pinnedDraftFacts")
    expect(clinicalCaseReviewSource).toContain("textareaClassName")
    expect(clinicalCaseReviewSource).toContain("focus:min-h-[280px]")
    expect(clinicalCaseReviewSource).toContain("max-h-[280px]")
    expect(clinicalCaseReviewSource).toContain("resize-none")
    expect(clinicalCaseReviewSource).toContain("Issue sign-off")
    expect(clinicalCaseReviewSource).toContain("signOffParts")
    expect(clinicalCaseReviewSource).not.toContain("uppercase tracking-[0.08em]")
    expect(clinicalCaseReviewSource).toContain("Saved as you type. Private until you send.")
    expect(clinicalCaseReviewSource).toContain("Add one clinical note line before signing.")
    expect(clinicalCaseReviewSource).toContain("Structured SOAP note")
    expect(clinicalCaseReviewSource).toContain("Subjective")
    expect(clinicalCaseReviewSource).toContain("Objective")
    expect(clinicalCaseReviewSource).toContain("Assessment")
    expect(clinicalCaseReviewSource).toContain("composeSoapDraft")
    expect(clinicalCaseReviewSource).not.toContain("Auto-saves as you type.")
    expect(clinicalCaseReviewSource).not.toContain("Only you can see this note until you send.")
    expect(clinicalCaseReviewSource).not.toContain("Approving sends the cert and saves this note.")
    expect(clinicalCaseReviewSource).toContain("draftNoteSaveError && onDraftNoteSave")
    expect(clinicalCaseReviewSource).not.toContain("Save edits before making the decision.")
    expect(requestInfoSource).toContain("splitCompactReview")
    expect(requestInfoSource).toContain("showCompactRequestHeader")
  })

  it("keeps staff routes free of marketing cookie overlays", () => {
    const globalClientsSource = read("components/providers/global-deferred-clients.tsx")

    expect(globalClientsSource).toContain("AUTHENTICATED_APP_PATH_PREFIXES")
    expect(globalClientsSource).toContain('"/dashboard"')
    expect(globalClientsSource).toContain('"/admin"')
    expect(globalClientsSource).toContain('"/doctor"')
    expect(globalClientsSource).toContain("shouldLoadCookieBanner")
    expect(globalClientsSource).toContain("if (allowCookieBanner)")
  })

  it("keeps complete patient states neutral while missing states stay prominent", () => {
    const decisionStripSource = read("components/doctor/patient-decision-strip.tsx")
    const profilePanelSource = read("components/doctor/patient-profile-panel.tsx")
    const patientDetailSource = read("app/doctor/patients/[id]/patient-detail-client.tsx")
    const caseSummarySource = read("lib/doctor/case-summary.ts")
    const clinicalCaseReviewSource = read("components/doctor/clinical-case-review.tsx")

    expect(decisionStripSource).not.toContain("Identity ready")
    expect(decisionStripSource).not.toContain('snapshot.completenessTone === "complete" ? "success"')
    expect(decisionStripSource).toContain("Details complete")
    expect(caseSummarySource).toContain("Note ready")
    expect(decisionStripSource).toContain("missing &&")
    expect(decisionStripSource).not.toContain("summary.actionLabel")
    expect(decisionStripSource).toContain("showPatientName")
    expect(decisionStripSource).toContain("summaryOnly")
    expect(decisionStripSource).toContain("revealIdentityByDefault")
    expect(decisionStripSource).toContain("First visit")
    expect(decisionStripSource).toContain("Patient details")
    expect(decisionStripSource).not.toContain("Identity and notes")
    expect(decisionStripSource).toContain("Hidden ending")
    expect(decisionStripSource).toContain("Show identity")
    expect(decisionStripSource).toContain("renderSummaryFacts")
    expect(decisionStripSource).not.toContain("rounded-lg border border-border/50 bg-background/70")
    expect(decisionStripSource).toContain("line-clamp-2 max-w-full whitespace-normal break-words")
    expect(decisionStripSource).toContain('isCompact ? "text-xs text-slate-400"')
    expect(decisionStripSource).toContain('"identity"')
    expect(decisionStripSource).toContain("identifierReveal")
    expect(decisionStripSource).toContain("fetchWithCsrf")
    expect(decisionStripSource).toContain('wide ? "line-clamp-2 break-words" : "truncate"')
    expect(clinicalCaseReviewSource).toContain("hideRecommendedPlan")
    expect(clinicalCaseReviewSource).not.toContain("Looks approvable")
    expect(clinicalCaseReviewSource).not.toContain("ACTION_STYLES")
    expect(profilePanelSource).not.toContain('snapshot.completenessTone === "complete"\\n      ? "success"')
    expect(patientDetailSource).toContain('"Synced in Parchment"')
    expect(patientDetailSource).toContain("hasParchmentBlocker")
    expect(patientDetailSource).toContain("hasPrescribingIdentityBlocker")
    expect(patientDetailSource).toContain("Verify identity:")
    expect(patientDetailSource).toContain("disabled={isParchmentSyncPending || hasPrescribingIdentityBlocker}")
    expect(patientDetailSource).toContain("disabled={isPrescriptionRefreshPending || hasPrescribingIdentityBlocker}")
    expect(patientDetailSource).toContain("disabled={!canUseParchment}")
    expect(read("app/doctor/queue/queue-table.tsx")).toContain("Verify identity · Missing")
    expect(patientDetailSource).toContain('"Prescribing"')
    expect(patientDetailSource).toContain('"Latest request"')
    expect(patientDetailSource).not.toContain('"Last request"')
    expect(patientDetailSource).toContain('"Not provided"')
  })

  it("keeps the patient profile drawer as a fast reference surface", () => {
    const source = read("components/doctor/patient-profile-panel.tsx")

    expect(source).toContain('aria-label="Identity risk"')
    expect(source).toContain('aria-label="Prescribing readiness"')
    expect(source).toContain('aria-label="Latest request"')
    expect(source).toContain('aria-label="Patient timeline"')
    expect(source).toContain("Contact and identifiers")
    expect(source).not.toContain("TabsList")
  })

  it("keeps route-facing code off broad public component barrels", () => {
    const blockedBarrelPattern =
      /from\s+["']@\/components\/(?:marketing|marketing\/sections|marketing\/shared|sections|shared)["']/g
    const files = [
      ...collectSourceFiles("app"),
      ...collectSourceFiles("components"),
    ]
    const offenders = files.flatMap((file) => {
      const matches = read(file).match(blockedBarrelPattern) ?? []

      return matches.map((match) => `${file}: ${match}`)
    })

    expect(offenders).toEqual([])
  })

  it("keeps pricing content server-rendered and isolates the sticky CTA client island", () => {
    const pricingContentSource = read("app/pricing/pricing-content.tsx")
    const stickyCtaSource = read("app/pricing/pricing-sticky-cta.tsx")

    expect(pricingContentSource.startsWith('"use client"')).toBe(false)
    expect(pricingContentSource).not.toContain("framer-motion")
    expect(pricingContentSource).not.toContain("useEffect")
    expect(stickyCtaSource.startsWith('"use client"')).toBe(true)
    expect(stickyCtaSource).toContain("IntersectionObserver")
  })

  it("keeps the medical certificate landing page server-rendered with narrow client controls", () => {
    const landingSource = read("components/marketing/med-cert-landing.tsx")
    const controlsSource = read("components/marketing/med-cert-client-controls.tsx")

    expect(landingSource.startsWith('"use client"')).toBe(false)
    expect(landingSource).not.toContain("LandingPageShell")
    expect(landingSource).not.toContain("usePatientCount")
    expect(landingSource).not.toContain("useLandingAnalytics")
    expect(controlsSource.startsWith('"use client"')).toBe(true)
    expect(controlsSource).toContain("useLandingAnalytics")
    expect(controlsSource).toContain("useServiceAvailability")
    expect(controlsSource).toContain("StickyCTA")
  })

  it("keeps the reusable service funnel shell server-rendered with client islands only where needed", () => {
    const funnelShellSource = read("components/marketing/service-funnel-page.tsx")
    const heroSectionSource = read("components/marketing/funnel/hero-section.tsx")
    const trimmedFunnelShellSource = funnelShellSource.trimStart()
    const trimmedHeroSectionSource = heroSectionSource.trimStart()

    expect(trimmedFunnelShellSource.startsWith('"use client"')).toBe(false)
    expect(trimmedFunnelShellSource.startsWith("'use client'")).toBe(false)
    expect(funnelShellSource).not.toContain("framer-motion")
    expect(funnelShellSource).not.toContain("useEffect")
    expect(funnelShellSource).not.toContain("useState")
    expect(trimmedHeroSectionSource.startsWith("'use client'")).toBe(true)
  })

  it("keeps static service funnel sections off Framer and client-only hooks", () => {
    const staticFunnelFiles = [
      "components/marketing/funnel/who-its-for-section.tsx",
      "components/marketing/funnel/how-it-works-section.tsx",
      "components/marketing/funnel/after-submit-section.tsx",
      "components/marketing/funnel/specialized-services-section.tsx",
      "components/marketing/funnel/trust-section.tsx",
      "components/marketing/funnel/faq-section.tsx",
      "components/marketing/sections/pricing-section.tsx",
      "components/ui/section-pill.tsx",
    ]

    for (const file of staticFunnelFiles) {
      const source = read(file)
      const trimmedSource = source.trimStart()

      expect(trimmedSource.startsWith('"use client"')).toBe(false)
      expect(trimmedSource.startsWith("'use client'")).toBe(false)
      expect(source).not.toContain("framer-motion")
      expect(source).not.toContain("useReducedMotion")
      expect(source).not.toContain("motion.")
      expect(source).not.toContain("@/components/ui/button")
    }
  })

  it("keeps the FAQ accordion interactive without pulling Framer into every FAQ page", () => {
    const faqListSource = read("components/ui/faq-list.tsx")

    expect(faqListSource.trimStart().startsWith('"use client"')).toBe(true)
    expect(faqListSource).toContain("@/components/ui/accordion")
    expect(faqListSource).not.toContain("framer-motion")
    expect(faqListSource).not.toContain("useReducedMotion")
    expect(faqListSource).not.toContain("motion.")
  })

  it("keeps shared static section primitives server-rendered", () => {
    const staticSectionFiles = [
      "components/sections/comparison-table.tsx",
      "components/sections/feature-grid.tsx",
      "components/sections/icon-checklist.tsx",
      "components/sections/image-text-split.tsx",
      "components/sections/logo-badge-strip.tsx",
      "components/sections/process-steps.tsx",
      "components/sections/section-header.tsx",
      "components/sections/timeline.tsx",
    ]

    for (const file of staticSectionFiles) {
      const source = read(file)
      const trimmedSource = source.trimStart()

      expect(trimmedSource.startsWith('"use client"')).toBe(false)
      expect(trimmedSource.startsWith("'use client'")).toBe(false)
      expect(source).not.toContain("framer-motion")
      expect(source).not.toContain("useScrollReveal")
      expect(source).not.toContain("useReducedMotion")
      expect(source).not.toContain("motion.")
    }
  })
})
