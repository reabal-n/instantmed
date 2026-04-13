"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/supabase/auth-provider"
import Link from "next/link"
import { SheetPanel } from "@/components/panels/sheet-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, RefreshCw, Loader2, FileText } from "lucide-react"
import { releaseIntakeLockAction } from "@/app/actions/intake-lock"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import { usePanel } from "@/components/panels/panel-provider"
import { CertificatePreviewDialog } from "@/components/doctor/certificate-preview-dialog"
import { useIntakeLock } from "@/components/doctor/hooks/use-intake-lock"
import { useAuditTrail } from "@/components/doctor/hooks/use-audit-trail"
import { useReviewActions } from "@/components/doctor/review-actions"

import {
  IntakeReviewProvider,
  type ReviewData,
} from "@/components/doctor/review/intake-review-context"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
  isConcerningValue,
  formatDate,
  getStatusColor,
} from "@/components/doctor/review/utils"
import { PatientInfoCard } from "@/components/doctor/review/patient-info-card"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { ClinicalNotesEditor } from "@/components/doctor/review/clinical-notes-editor"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { DeclineIntakeDialog } from "@/components/doctor/review/decline-intake-dialog"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"

interface IntakeReviewPanelProps {
  intakeId: string
  onActionComplete?: () => void
}

export function IntakeReviewPanel({ intakeId, onActionComplete }: IntakeReviewPanelProps) {
  useAuth()
  const { closePanel } = usePanel()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  const viewStartTime = useRef<number>(Date.now())

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch(`/api/doctor/intakes/${intakeId}/review-data`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load" }))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const reviewData: ReviewData = await res.json()
        if (!cancelled) {
          setData(reviewData)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load intake data")
          setIsLoading(false)
        }
      }
    }
    fetchData()
    return () => { cancelled = true }
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

  // Pre-fill clinical notes from AI draft when data first loads
  useEffect(() => {
    if (!data) return
    const existingNotes = data.intake.doctor_notes || ""
    if (!existingNotes && data.aiDrafts) {
      const clinicalDraft = findClinicalNoteDraft(data.aiDrafts)
      if (clinicalDraft) {
        const formatted = formatClinicalNoteContent(clinicalDraft.content)
        if (formatted) {
          actions.setDoctorNotes(formatted)
          // Note: isAiPrefilled is managed inside useReviewActions
        } else {
          actions.setDoctorNotes("")
        }
      } else {
        actions.setDoctorNotes("")
      }
    } else {
      actions.setDoctorNotes(existingNotes)
    }
    // Only run when data first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Handle panel close - release lock + log view duration
  const handlePanelClose = useCallback(() => {
    if (data) {
      const duration = Date.now() - viewStartTime.current
      navigator.sendBeacon?.(
        "/api/doctor/log-view-duration",
        JSON.stringify({ intakeId: data.intake.id, durationMs: duration })
      )
      releaseLock()
    }
  }, [data, releaseLock])

  // --- Render ---

  // Loading skeleton
  if (isLoading) {
    return (
      <SheetPanel
        title="Loading case..."
        width={720}
        onClose={handlePanelClose}
      >
        <div className="space-y-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </SheetPanel>
    )
  }

  // Error state
  if (error || !intake) {
    return (
      <SheetPanel title="Error" width={720} onClose={handlePanelClose}>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">{error || "Intake not found"}</p>
          <Button variant="outline" className="mt-4" onClick={closePanel}>
            Close
          </Button>
        </div>
      </SheetPanel>
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
    noteSaved: actions.noteSaved,
    setNoteSaved: actions.setNoteSaved,
    isAiPrefilled: actions.isAiPrefilled,
    hasClinicalDraft: actions.hasClinicalDraft,
    isRegenerating: actions.isRegenerating,
    notesRef: actions.notesRef,
    isPending: actions.isPending,
    handleMedCertApprove: actions.handleMedCertApprove,
    handleStatusChange: actions.handleStatusChange,
    handleDecline: actions.handleDecline,
    handleSaveNotes: actions.handleSaveNotes,
    handleGenerateOrRegenerateNote: actions.handleGenerateOrRegenerateNote,
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

  return (
    <>
      <SheetPanel
        title={intake.patient.full_name}
        description={`${service?.short_name || formatServiceType(service?.type || "")} · ${formatIntakeStatus(intake.status)}`}
        width={720}
        onClose={handlePanelClose}
      >
        <IntakeReviewProvider value={contextValue}>
          <div className="space-y-5">
            {/* Top bar: status + open full page */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(intake.status)}>
                {formatIntakeStatus(intake.status)}
              </Badge>
              <Link
                href={`/doctor/intakes/${intake.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => closePanel()}
              >
                <ExternalLink className="h-3 w-3" />
                Open full page
              </Link>
            </div>

            {/* Lock warning */}
            {lockWarning && (
              <div className="p-3 rounded-lg bg-warning-light border border-warning-border text-sm text-warning">
                {lockWarning}
              </div>
            )}

            <PatientInfoCard />
            <RequestInfoCard />
            <SafetyFlagsCard />
            <ClinicalNotesEditor />
            <IntakeActionButtons />

            {/* Certificate delivery status - only for approved/completed med certs */}
            {data?.certificate && (intake.status === "approved" || intake.status === "completed") && (
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Certificate delivery</span>
                    {data.certificate.email_opened_at ? (
                      <Badge className="bg-success-light text-success border-success-border text-xs">
                        Opened by patient
                      </Badge>
                    ) : data.certificate.email_sent_at ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Sent - not yet opened
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Pending delivery
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={actions.isViewingCert}
                      onClick={actions.handleViewCertificate}
                    >
                      {actions.isViewingCert ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 mr-1" />
                      )}
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={actions.isResending || (data.certificate.resend_count ?? 0) >= 3}
                      onClick={actions.handleResend}
                      title={(data.certificate.resend_count ?? 0) >= 3 ? "Maximum resends reached" : undefined}
                    >
                      {actions.isResending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      {(data.certificate.resend_count ?? 0) > 0
                        ? `Resent (${data.certificate.resend_count})`
                        : "Resend"}
                    </Button>
                  </div>
                </div>
                {data.certificate.email_opened_at && (
                  <p className="text-xs text-muted-foreground">
                    Opened {new Date(data.certificate.email_opened_at).toLocaleString("en-AU", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </IntakeReviewProvider>
      </SheetPanel>

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
