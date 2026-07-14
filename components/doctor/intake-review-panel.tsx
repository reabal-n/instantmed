"use client"

import { ArrowDown, ArrowUp, ExternalLink, LockKeyhole, RefreshCw, User } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { CertificatePreviewDialog } from "@/components/doctor/certificate-preview-dialog"
import { useAuditTrail } from "@/components/doctor/hooks/use-audit-trail"
import { type IntakeLockState, useIntakeLock } from "@/components/doctor/hooks/use-intake-lock"
import { useReviewData } from "@/components/doctor/hooks/use-review-data"
import { IntakeFlagsPanel } from "@/components/doctor/intake-flags-panel"
import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientProfilePanel } from "@/components/doctor/patient-profile-panel"
import { DeclineIntakeDialog } from "@/components/doctor/review/decline-intake-dialog"
import { IntakeReviewCockpit } from "@/components/doctor/review/intake-review-cockpit"
import {
  IntakeReviewProvider,
} from "@/components/doctor/review/intake-review-context"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
  formatDate,
  getStatusColor,
  isConcerningValue,
  stripGenericClinicalNoteBoilerplate,
} from "@/components/doctor/review/utils"
import { useReviewActions } from "@/components/doctor/review-actions"
import { SlaChip } from "@/components/doctor/sla-chip"
import { usePanel } from "@/components/panels/panel-provider"
import { SheetPanel } from "@/components/panels/sheet-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { parseIntakeFlags } from "@/lib/clinical/intake-flags"
import { buildAdminIntakeHref, buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { isReviewLockableStatus } from "@/lib/doctor/intake-lock-status"
import { logIntakeViewDuration, preloadViewDurationLogging } from "@/lib/doctor/log-view-duration-client"
import { QUEUE_WAIT_TARGET_MINUTES } from "@/lib/doctor/queue-pressure"
import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { isPrescribingServiceRequest } from "@/lib/doctor/service-types"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import { isEditableOrInteractiveKeyboardTarget } from "@/lib/hooks/use-doctor-shortcuts"
import { useAuth } from "@/lib/supabase/auth-provider"
import { cn } from "@/lib/utils"

/**
 * Shell wrappers. `SheetShell` is the slide-over chrome (used everywhere
 * IntakeReviewPanel is opened via `openPanel`). `InlineShell` is the
 * inline-pane chrome (used on `/dashboard` for the two-pane layout).
 */
function SheetShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose?: () => void
  children: React.ReactNode
}) {
  return (
    <SheetPanel title={title} description={description} width={1040} onClose={onClose}>
      {children}
    </SheetPanel>
  )
}

function InlineShell({
  children,
}: {
  title: string
  description?: string
  onClose?: () => void
  children: React.ReactNode
}) {
  // No chrome — the queue's split-pane already supplies the right-side
  // container, border, and overflow management. `onClose` is a no-op
  // inline because j/k in the queue replaces it (selection drives detail).
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
      {children}
    </div>
  )
}

interface IntakeReviewPanelProps {
  intakeId: string
  previewIntake?: {
    patient: {
      full_name: string
      date_of_birth?: string | null
      sex?: string | null
      suburb?: string | null
      state?: string | null
      postcode?: string | null
    }
    service?: { name?: string | null; type?: string | null; short_name?: string | null } | null
    status?: string | null
    paid_at?: string | null
    submitted_at?: string | null
  }
  onActionComplete?: (options?: { advance?: boolean }) => void
  onNextCase?: () => void
  onPrevCase?: () => void
  caseIndex?: number
  totalCases?: number
  profileMode?: "doctor" | "admin"
  /**
   * Render inline (no SheetPanel chrome) for the `/dashboard` two-pane layout.
   * Skips the slide-over wrapper, hides the case-nav top arrows (j/k drives
   * navigation from the queue itself), and keeps a slim top bar with status
 * + Patient profile / Full case actions. Lock + audit still release on
   * unmount, so the parent should force-remount via `key={intakeId}`.
   */
  inline?: boolean
  onBatchReviewResolved?: (intakeId: string) => void
  /** Updated queue-row revision used to refresh only the open review payload. */
  reviewRevision?: string | null
}

type PreviewPatient = NonNullable<IntakeReviewPanelProps["previewIntake"]>["patient"]

function formatPreviewAgeDob(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "DOB pending"
  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return "DOB pending"
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1
  const dob = birthDate.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  return `${age}y / ${dob}`
}

function formatPreviewLocation(patient?: PreviewPatient): string {
  if (!patient) return "Address loading"
  return [patient.suburb, patient.state, patient.postcode].filter(Boolean).join(", ") || "Address loading"
}

function formatClaimAge(lockedAt: string | null, now = Date.now()): string {
  if (!lockedAt) return "just now"
  const lockedAtMs = new Date(lockedAt).getTime()
  if (!Number.isFinite(lockedAtMs)) return "just now"
  const minutes = Math.max(0, Math.floor((now - lockedAtMs) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? "1h ago" : `${hours}h ago`
}

function formatClaimStateLabel(lockState: IntakeLockState, now = Date.now()): string | null {
  if (lockState.status === "inactive") return null
  if (lockState.status === "claiming") return null
  if (lockState.status === "claimed") return `You're reviewing · ${formatClaimAge(lockState.lockedAt, now)}`
  return lockState.lockedByName ? `${lockState.lockedByName} is reviewing` : "Another doctor is reviewing"
}

export function IntakeReviewPanel({
  intakeId,
  previewIntake,
  onActionComplete,
  onNextCase,
  onPrevCase,
  caseIndex,
  totalCases,
  profileMode = "doctor",
  inline = false,
  onBatchReviewResolved,
  reviewRevision,
}: IntakeReviewPanelProps) {
  useAuth()
  const { closePanel, openPanel } = usePanel()
  // This hook runs only after an explicit case open; queue hover remains visual
  // and does not prefetch PHI-heavy review payloads.
  const {
    data,
    isLoading,
    error,
    refreshError,
    isRefreshing,
    reloadReviewData,
  } = useReviewData({ intakeId, initialLoadDelayMs: 150 })

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  const viewStartTime = useRef<number>(Date.now())
  const initializedNotesForIntakeRef = useRef<string | null>(null)
  const previousReviewRevisionRef = useRef(reviewRevision)

  useEffect(() => {
    preloadViewDurationLogging()
  }, [])

  // Computed values from data
  const intake = data?.intake
  const service = intake?.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = (intake?.answers?.answers || {}) as Record<string, unknown>
  const intakeAnswers = intake?.answers?.answers as Record<string, unknown> | undefined

  // NOTE: emergency_symptoms is a safety-gate toggle ("I am NOT experiencing an emergency" -> true),
  // not an actual symptom field. Blocking happens at intake time, so it's excluded here.
  const hasRedFlags = Boolean(
    isConcerningValue(intakeAnswers?.red_flags_detected) ||
    intake?.risk_tier === "high" ||
    intake?.requires_live_consult
  )
  const redFlagDetails = intake
    ? [
        isConcerningValue(intakeAnswers?.red_flags_detected) && `Red flags: ${intakeAnswers?.red_flags_detected}`,
        intake.risk_tier === "high" && "High risk tier",
        intake.requires_live_consult && "Requires live consult",
      ].filter(Boolean) as string[]
    : []

  // Arrow key navigation between cases
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableOrInteractiveKeyboardTarget(e.target)) return
      if (e.key === "ArrowDown" && onNextCase) { e.preventDefault(); onNextCase() }
      if (e.key === "ArrowUp" && onPrevCase) { e.preventDefault(); onPrevCase() }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNextCase, onPrevCase])

  // ---- Extracted hooks ----

  // Lock management: acquire on data load, extend on interval, release on unmount
  const lockableForReview = Boolean(data && isReviewLockableStatus(data.intake.status))
  const { lockWarning, releaseLock, lockState } = useIntakeLock(intakeId, lockableForReview)
  const [claimAgeNow, setClaimAgeNow] = useState(() => Date.now())

  useEffect(() => {
    if (lockState.status !== "claimed") return
    setClaimAgeNow(Date.now())
    const interval = window.setInterval(() => setClaimAgeNow(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [lockState.lockedAt, lockState.status])

  // Audit trail: fire one-shot audit events after data loads
  useAuditTrail(intakeId, !!data, {
    serviceType: service?.type,
    answers: intakeAnswers,
  })

  // Review actions: all approve/decline/notes/cert handlers + keyboard shortcuts
  const actions = useReviewActions({
    data,
    reloadReviewData,
    hasRedFlags,
    redFlagsAcknowledged,
    onActionComplete,
  })

  // Pre-fill clinical notes when data first loads.
  // setInitialNotes(notes, dbNotes) sets the baseline so auto-save only fires
  // for content that differs from what's already in the DB.
  // AI drafts use themselves as the baseline so they are visible but not
  // persisted until the doctor edits, saves, or approves.
  useEffect(() => {
    if (!data) return
    if (initializedNotesForIntakeRef.current === data.intake.id) return
    initializedNotesForIntakeRef.current = data.intake.id
    const existingNotes = stripGenericClinicalNoteBoilerplate(data.intake.doctor_notes || "")
    const fallbackDraftNote = buildClinicalCaseSummary({
      answers: (data.intake.answers?.answers || {}) as Record<string, unknown>,
      category: data.intake.category,
      subtype: data.intake.subtype,
      serviceType: (data.intake.service as { type?: string | null } | null | undefined)?.type,
      patientName: data.intake.patient.full_name,
      patientDateOfBirth: data.intake.patient.date_of_birth ?? null,
      patientSex: data.intake.patient.sex ?? null,
      riskTier: data.intake.risk_tier,
      requiresLiveConsult: data.intake.requires_live_consult,
      scriptSent: data.intake.script_sent,
    }).draftNote
    if (!existingNotes && data.aiDrafts) {
      const clinicalDraft = findClinicalNoteDraft(data.aiDrafts)
      if (clinicalDraft) {
        const formatted = formatClinicalNoteContent(clinicalDraft.content)
        const resolvedDraftNote = formatted?.trim() ? formatted : fallbackDraftNote
        actions.setInitialNotes(resolvedDraftNote, resolvedDraftNote)
      } else {
        actions.setInitialNotes(fallbackDraftNote, fallbackDraftNote)
      }
    } else {
      // dbNotes=existingNotes → already in DB, no immediate auto-save
      actions.setInitialNotes(existingNotes, existingNotes)
    }
    // Only run when this request first arrives. Targeted fulfilment refreshes
    // must never replace an in-progress clinician note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    if (previousReviewRevisionRef.current === undefined) {
      previousReviewRevisionRef.current = reviewRevision
      return
    }
    if (!reviewRevision || reviewRevision === previousReviewRevisionRef.current || !data) return
    previousReviewRevisionRef.current = reviewRevision
    void reloadReviewData({ background: true })
  }, [data, reloadReviewData, reviewRevision])

  const shouldRefreshPendingFulfilment = Boolean(
    data &&
    data.intake.script_sent !== true &&
    isPrescribingServiceRequest(service?.type, data.intake.subtype),
  )

  useEffect(() => {
    if (!shouldRefreshPendingFulfilment) return
    const refreshOnFocus = () => void reloadReviewData({ background: true })
    window.addEventListener("focus", refreshOnFocus)
    return () => window.removeEventListener("focus", refreshOnFocus)
  }, [reloadReviewData, shouldRefreshPendingFulfilment])

  // Handle panel close - release lock + log view duration
  const handlePanelClose = useCallback(() => {
    if (data) {
      logIntakeViewDuration(data.intake.id, viewStartTime.current)
      releaseLock()
    }
  }, [data, releaseLock])

  // --- Render ---

  // Conditional shell. Inline mode = plain `<div>` so the panel renders
  // inside the parent's right pane without slide-over chrome. Sheet mode
  // = the existing slide-over experience (admin patient drawer, doctor
  // intake-detail page, anywhere the panel is opened via `openPanel`).
  const Shell = inline ? InlineShell : SheetShell

  // Loading skeleton
  if (isLoading) {
    const previewService = previewIntake?.service
    const previewServiceLabel = previewService?.short_name || previewService?.name || formatServiceType(previewService?.type || "")
    const previewStatusLabel = formatIntakeStatus(previewIntake?.status || "paid")
    const previewAgeDob = formatPreviewAgeDob(previewIntake?.patient.date_of_birth)
    const previewLocation = formatPreviewLocation(previewIntake?.patient)
    const previewFirstName = previewIntake?.patient.full_name?.trim().split(/\s+/)[0] || null
    const loadingAnswersLabel = previewFirstName ? `Loading ${previewFirstName}'s answers.` : "Loading answers."
    const skeletonTone = "bg-[#F1EFEA]/80 dark:bg-white/10"
    return (
      <Shell title={loadingAnswersLabel} onClose={handlePanelClose}>
        <div
          className={cn(inline ? "flex h-full min-h-0 flex-col gap-3" : "space-y-5")}
          data-testid="intake-review-loading"
        >
          {previewIntake ? (
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{previewIntake.patient.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {previewServiceLabel} · {previewStatusLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                    {loadingAnswersLabel}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className={`h-6 w-48 ${skeletonTone}`} />
          )}
          <div className={cn(inline ? "min-h-0 flex-1 space-y-3 overflow-hidden" : "space-y-5")}>
            <section className="rounded-xl border border-border/55 bg-muted/15 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-muted-foreground">
                    Patient details
                  </p>
                  {previewIntake ? (
                    <p className="text-sm font-semibold text-foreground">{previewIntake.patient.full_name}</p>
                  ) : (
                    <Skeleton className={`h-4 w-36 ${skeletonTone}`} />
                  )}
                </div>
                {previewIntake ? (
                  <Badge className={getStatusColor(previewIntake.status || "paid")}>
                    {previewStatusLabel}
                  </Badge>
                ) : (
                  <Skeleton className={`h-5 w-28 rounded-full ${skeletonTone}`} />
                )}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {previewIntake ? (
                  <>
                    <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border/35">
                      <p className="text-[11px] font-medium text-muted-foreground">DOB</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{previewAgeDob}</p>
                    </div>
                    <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border/35">
                      <p className="text-[11px] font-medium text-muted-foreground">Service</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{previewServiceLabel || "Clinical request"}</p>
                    </div>
                    <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border/35">
                      <p className="text-[11px] font-medium text-muted-foreground">Sex</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{previewIntake.patient.sex || "Not collected"}</p>
                    </div>
                    <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border/35">
                      <p className="text-[11px] font-medium text-muted-foreground">Location</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{previewLocation}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Skeleton className={`h-12 ${skeletonTone}`} />
                    <Skeleton className={`h-12 ${skeletonTone}`} />
                    <Skeleton className={`h-12 ${skeletonTone}`} />
                    <Skeleton className={`h-12 ${skeletonTone}`} />
                  </>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-border/55 bg-muted/15 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                  Checks
                </p>
                <Skeleton className={`h-5 w-8 rounded-full ${skeletonTone}`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Skeleton className={`h-6 w-24 rounded-full ${skeletonTone}`} />
                <Skeleton className={`h-6 w-24 rounded-full ${skeletonTone}`} />
                <Skeleton className={`h-6 w-24 rounded-full ${skeletonTone}`} />
              </div>
            </section>
            <section className="min-h-[116px] rounded-xl border border-border/55 bg-muted/15 p-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                Reason for visit
              </p>
              <Skeleton className={`mt-3 h-4 w-full ${skeletonTone}`} />
              <Skeleton className={`mt-2 h-4 w-10/12 ${skeletonTone}`} />
              <Skeleton className={`mt-2 h-4 w-7/12 ${skeletonTone}`} />
            </section>
            <section className="min-h-[136px] rounded-xl border border-border/55 bg-muted/15 p-3" data-review-skeleton-reserved>
              <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                Patient answers
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Skeleton className={`h-10 ${skeletonTone}`} />
                <Skeleton className={`h-10 ${skeletonTone}`} />
                <Skeleton className={`h-10 ${skeletonTone}`} />
                <Skeleton className={`h-10 ${skeletonTone}`} />
              </div>
            </section>
            <section className="min-h-[154px] rounded-xl border border-border/55 bg-muted/15 p-3" data-review-skeleton-reserved>
              <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                Draft note
              </p>
              <div className="mt-3 space-y-2">
                <Skeleton className={`h-4 w-full ${skeletonTone}`} />
                <Skeleton className={`h-4 w-11/12 ${skeletonTone}`} />
                <Skeleton className={`h-4 w-9/12 ${skeletonTone}`} />
                <Skeleton className={`h-8 w-44 ${skeletonTone}`} />
              </div>
            </section>
          </div>
          <div className="shrink-0 border-t border-border bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className={`h-8 w-40 rounded-md ${skeletonTone}`} aria-hidden="true" />
              <div className={`h-8 w-36 rounded-md ${skeletonTone}`} aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {loadingAnswersLabel}
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  // Error state
  if (error || !intake) {
    return (
      <Shell title="Error" onClose={handlePanelClose}>
        <div className="py-12 text-center">
          <p className="text-destructive font-medium">{error || "Intake not found"}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void reloadReviewData({ background: false })}>
              Retry
            </Button>
            {!inline ? (
              <Button variant="ghost" onClick={closePanel}>
                Close
              </Button>
            ) : null}
          </div>
        </div>
      </Shell>
    )
  }

  const contextValue = {
    data: data!,
    intake,
    service,
    answers,
    intakeAnswers,
    reloadReviewData,
    isRefreshingReviewData: isRefreshing,
    hasRedFlags,
    redFlagDetails,
    redFlagsAcknowledged,
    setRedFlagsAcknowledged,
    doctorNotes: actions.doctorNotes,
    setDoctorNotes: actions.setDoctorNotes,
    setInitialNotes: actions.setInitialNotes,
    noteSaved: actions.noteSaved,
    setNoteSaved: actions.setNoteSaved,
    noteDirty: actions.noteDirty,
    savedAt: actions.savedAt,
    isAutoSaving: actions.isAutoSaving,
    autoSaveError: actions.autoSaveError,
    isAiPrefilled: actions.isAiPrefilled,
    hasClinicalDraft: actions.hasClinicalDraft,
    isRegenerating: actions.isRegenerating,
    notesRef: actions.notesRef,
    isPending: actions.isPending,
    isResending: actions.isResending,
    isViewingCert: actions.isViewingCert,
    handleMedCertApprove: actions.handleMedCertApprove,
    handleStatusChange: actions.handleStatusChange,
    handleDecline: actions.handleDecline,
    handleSaveNotes: actions.handleSaveNotes,
    handleGenerateOrRegenerateNote: actions.handleGenerateOrRegenerateNote,
    handleOpenParchmentPrescribe: actions.handleOpenParchmentPrescribe,
    handleApprovePrescribedScript: actions.handleApprovePrescribedScript,
    handleResend: actions.handleResend,
    handleViewCertificate: actions.handleViewCertificate,
    showDeclineDialog: actions.showDeclineDialog,
    setShowDeclineDialog: actions.setShowDeclineDialog,
    declineReason: actions.declineReason,
    setDeclineReason: actions.setDeclineReason,
    declineReasonCode: actions.declineReasonCode,
    setDeclineReasonCode: actions.setDeclineReasonCode,
    handleDeclineReasonCodeChange: actions.handleDeclineReasonCodeChange,
    isLoadingPreview: actions.isLoadingPreview,
    formatDate,
    getStatusColor,
  }
  const fullCaseHref = profileMode === "admin"
    ? buildAdminIntakeHref(intake.id)
    : buildDoctorIntakeHref(intake.id)
  const claimStateLabel = formatClaimStateLabel(lockState, claimAgeNow)
  const visibleClaimStateLabel = lockState.status === "blocked" ? claimStateLabel : null
  const previousIntakeCount = data.previousIntakeCount ?? data.previousIntakes?.length ?? 0
  const queueEnteredAt = getQueueEnteredAt(intake)

  return (
    <>
      <Shell
        title={intake.patient.full_name}
        description={[
          service?.short_name || formatServiceType(service?.type || ""),
          formatIntakeStatus(intake.status),
        ].filter(Boolean).join(" · ")}
        onClose={handlePanelClose}
      >
        <IntakeReviewProvider value={contextValue}>
          <div
            className={cn(
              inline ? "flex h-full min-h-0 flex-col gap-3 motion-safe:animate-[review-pane-in_280ms_cubic-bezier(0.16,1,0.3,1)]" : "space-y-5 motion-safe:animate-[fade-in-up_200ms_cubic-bezier(0.16,1,0.3,1)]",
            )}
            data-testid="intake-review-panel"
          >
            {/* Queue state stays separate from patient safety context. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(intake.status)}>
                  {formatIntakeStatus(intake.status)}
                </Badge>
                <SlaChip
                  paidAt={queueEnteredAt}
                  mode="waiting"
                  targetMinutes={QUEUE_WAIT_TARGET_MINUTES}
                  showTargetState
                />
                {visibleClaimStateLabel ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/35 px-2 py-1 text-[11px] font-semibold text-muted-foreground",
                      lockState.status === "blocked" && "border-warning-border bg-warning-light text-warning",
                    )}
                    data-review-claim-state={lockState.status}
                  >
                    <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{visibleClaimStateLabel}</span>
                  </span>
                ) : null}
              </div>
              {!inline && (onPrevCase || onNextCase) ? (
                <div className="flex items-center gap-1" aria-label="Case navigation">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous case"
                    disabled={!onPrevCase || caseIndex === 0}
                    onClick={onPrevCase}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next case"
                    disabled={!onNextCase || (caseIndex != null && totalCases != null && caseIndex >= totalCases - 1)}
                    onClick={onNextCase}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Lock warning */}
            {lockWarning && (
              <div className="p-3 rounded-lg bg-warning-light border border-warning-border text-sm text-warning">
                {lockWarning}
              </div>
            )}

            {refreshError ? (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-xs font-medium text-warning"
                role="status"
              >
                <span>Couldn’t refresh fulfilment status. Showing the last confirmed request state.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-warning-border bg-background"
                  disabled={isRefreshing}
                  onClick={() => void reloadReviewData({ background: true })}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                  Retry
                </Button>
              </div>
            ) : null}

            <PatientDecisionStrip
              intake={intake}
              answers={answers}
              previousIntakes={data.previousIntakes ?? []}
              previousIntakeCount={previousIntakeCount}
              service={service}
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border/65 bg-background text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground"
                    onClick={() => {
                      openPanel({
                        id: `${profileMode}-patient-profile-${intake.patient.id}`,
                        type: "drawer",
                        component: (
                          <PatientProfilePanel
                            patient={intake.patient}
                            answers={answers}
                            serviceContext={{
                              category: intake.category,
                              serviceType: service?.type,
                              subtype: intake.subtype,
                            }}
                            admin={profileMode === "admin"}
                            sourceLabel={intake.reference_number || "Current case"}
                          />
                        ),
                      })
                    }}
                  >
                    <User className="h-3.5 w-3.5" />
                    View profile
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border/65 bg-background text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground"
                  >
                    <Link href={fullCaseHref} onClick={inline ? undefined : () => closePanel()}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open full record
                    </Link>
                  </Button>
                </>
              }
            />

            <IntakeFlagsPanel
              flags={parseIntakeFlags((data.intake as { risk_flags?: unknown }).risk_flags)}
              hideRequestFieldFlags
            />

            <IntakeReviewCockpit
              className={inline ? "min-h-0 flex-1" : undefined}
              onBatchReviewResolved={onBatchReviewResolved}
            />
          </div>
        </IntakeReviewProvider>
      </Shell>

      <IntakeReviewProvider value={contextValue}>
        <DeclineIntakeDialog />
      </IntakeReviewProvider>

      {/* Certificate Preview Dialog */}
      {actions.certPreviewData && (
        <CertificatePreviewDialog
          open={actions.showCertPreview}
          onOpenChange={actions.setShowCertPreview}
          data={actions.certPreviewData}
          onConfirm={actions.handleCertPreviewConfirm}
          isPending={actions.isPending}
        />
      )}
    </>
  )
}
