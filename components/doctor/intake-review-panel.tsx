"use client"

import { ArrowDown, ArrowUp, ExternalLink, User } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { CertificatePreviewDialog } from "@/components/doctor/certificate-preview-dialog"
import { useAuditTrail } from "@/components/doctor/hooks/use-audit-trail"
import { useIntakeLock } from "@/components/doctor/hooks/use-intake-lock"
import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientProfilePanel } from "@/components/doctor/patient-profile-panel"
import { DeclineIntakeDialog } from "@/components/doctor/review/decline-intake-dialog"
import { IntakeReviewCockpit } from "@/components/doctor/review/intake-review-cockpit"
import {
  IntakeReviewProvider,
  type ReviewData,
} from "@/components/doctor/review/intake-review-context"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
  formatDate,
  getStatusColor,
  isConcerningValue,
} from "@/components/doctor/review/utils"
import { useReviewActions } from "@/components/doctor/review-actions"
import { usePanel } from "@/components/panels/panel-provider"
import { SheetPanel } from "@/components/panels/sheet-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { buildAdminIntakeHref, buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { logIntakeViewDuration, preloadViewDurationLogging } from "@/lib/doctor/log-view-duration-client"
import { consumePrefetchedData } from "@/lib/doctor/review-data-cache"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import { useAuth } from "@/lib/supabase/auth-provider"

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
    <div className="h-full min-h-0 overflow-y-auto p-5">
      {children}
    </div>
  )
}

interface IntakeReviewPanelProps {
  intakeId: string
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
}

export function IntakeReviewPanel({ intakeId, onActionComplete, onNextCase, onPrevCase, caseIndex, totalCases, profileMode = "doctor", inline = false }: IntakeReviewPanelProps) {
  useAuth()
  const { closePanel, openPanel } = usePanel()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  const viewStartTime = useRef<number>(Date.now())
  const loadSequenceRef = useRef(0)

  useEffect(() => {
    preloadViewDurationLogging()
  }, [])

  // Fetch data on mount - uses prefetched response from hover cache when available
  useEffect(() => {
    const loadSequence = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    setIsLoading(true)
    setError(null)
    async function fetchData() {
      try {
        const res = await (consumePrefetchedData(intakeId) ?? fetch(`/api/doctor/intakes/${intakeId}/review-data`))
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load" }))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const reviewData: ReviewData = await res.json()
        if (loadSequenceRef.current === loadSequence) {
          setData(reviewData)
          setIsLoading(false)
        }
      } catch (err) {
        if (loadSequenceRef.current === loadSequence) {
          setError(err instanceof Error ? err.message : "Failed to load intake data")
          setIsLoading(false)
        }
      }
    }
    fetchData()
  }, [intakeId])

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowDown" && onNextCase) { e.preventDefault(); onNextCase() }
      if (e.key === "ArrowUp" && onPrevCase) { e.preventDefault(); onPrevCase() }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNextCase, onPrevCase])

  // ---- Extracted hooks ----

  // Lock management: acquire on data load, extend on interval, release on unmount
  const { lockWarning, releaseLock } = useIntakeLock(intakeId, !!data)

  // Audit trail: fire one-shot audit events after data loads
  useAuditTrail(intakeId, !!data, {
    serviceType: service?.type,
    answers: intakeAnswers,
  })

  // Review actions: all approve/decline/notes/cert handlers + keyboard shortcuts
  const actions = useReviewActions({
    data,
    setData,
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
    const existingNotes = data.intake.doctor_notes || ""
    const isReviewable = !["approved", "completed", "awaiting_script", "declined"].includes(data.intake.status)
    if (!existingNotes && data.aiDrafts) {
      const clinicalDraft = findClinicalNoteDraft(data.aiDrafts)
      if (clinicalDraft) {
        const formatted = formatClinicalNoteContent(clinicalDraft.content)
        actions.setInitialNotes(formatted || "", formatted || "")
      } else {
        actions.setInitialNotes("", "")
      }
    } else {
      // dbNotes=existingNotes → already in DB, no immediate auto-save
      actions.setInitialNotes(existingNotes, existingNotes)
    }
    // Auto-focus notes for reviewable cases so doctor can start typing immediately
    if (isReviewable) {
      setTimeout(() => actions.notesRef.current?.focus(), 100)
    }
    // Only run when data first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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
    return (
      <Shell title="Loading case..." onClose={handlePanelClose}>
        <div className="space-y-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </Shell>
    )
  }

  // Error state
  if (error || !intake) {
    return (
      <Shell title="Error" onClose={handlePanelClose}>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">{error || "Intake not found"}</p>
          {!inline ? (
            <Button variant="outline" className="mt-4" onClick={closePanel}>
              Close
            </Button>
          ) : null}
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
    handleApproveAndOpenParchment: actions.handleApproveAndOpenParchment,
    handleResend: actions.handleResend,
    handleViewCertificate: actions.handleViewCertificate,
    showDeclineDialog: actions.showDeclineDialog,
    setShowDeclineDialog: actions.setShowDeclineDialog,
    declineReason: actions.declineReason,
    setDeclineReason: actions.setDeclineReason,
    declineReasonCode: actions.declineReasonCode,
    handleDeclineReasonCodeChange: actions.handleDeclineReasonCodeChange,
    isLoadingPreview: actions.isLoadingPreview,
    formatDate,
    getStatusColor,
  }
  const fullCaseHref = profileMode === "admin"
    ? buildAdminIntakeHref(intake.id)
    : buildDoctorIntakeHref(intake.id)

  return (
    <>
      <Shell
        title={intake.patient.full_name}
        description={[
          service?.short_name || formatServiceType(service?.type || ""),
          formatIntakeStatus(intake.status),
          caseIndex != null && totalCases != null ? `Case ${caseIndex + 1} of ${totalCases}` : null,
        ].filter(Boolean).join(" · ")}
        onClose={handlePanelClose}
      >
        <IntakeReviewProvider value={contextValue}>
          <div className="space-y-5">
            {/* Top bar: status, case navigation, and profile links */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {inline ? (
                  <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {intake.patient.full_name}
                  </h2>
                ) : null}
                <Badge className={getStatusColor(intake.status)}>
                  {formatIntakeStatus(intake.status)}
                </Badge>
                {caseIndex != null && totalCases != null && (
                  <Badge variant="outline" size="sm">Case {caseIndex + 1} of {totalCases}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Inline mode: j/k in the queue is the canonical case navigator,
                    so the in-panel ↑/↓ buttons are hidden. */}
                {!inline && (onPrevCase || onNextCase) && (
                  <div className="flex items-center gap-1">
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
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                  Patient profile
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={fullCaseHref} onClick={inline ? undefined : () => closePanel()}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Full case
                  </Link>
                </Button>
              </div>
            </div>

            {/* Lock warning */}
            {lockWarning && (
              <div className="p-3 rounded-lg bg-warning-light border border-warning-border text-sm text-warning">
                {lockWarning}
              </div>
            )}

            <PatientDecisionStrip
              intake={intake}
              answers={answers}
              previousIntakes={data?.previousIntakes ?? []}
              service={service}
              doctorNotes={actions.doctorNotes}
            />
            <IntakeReviewCockpit showDecisionStrip={false} />
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
