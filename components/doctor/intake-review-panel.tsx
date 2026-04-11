"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/supabase/auth-provider"
import Link from "next/link"
import { SheetPanel } from "@/components/panels/sheet-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, RefreshCw, Loader2, FileText } from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction } from "@/app/doctor/queue/actions"
import { fetchCertPreviewDataAction, approveWithPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import { CertificatePreviewDialog, type CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import { regenerateDrafts } from "@/app/actions/draft-approval"
import { resendCertificateAdmin } from "@/app/actions/resend-certificate-admin"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import { usePanel } from "@/components/panels/panel-provider"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"
import type { IntakeStatus, DeclineReasonCode } from "@/types/db"
import { DECLINE_REASONS } from "@/lib/doctor/constants"
import { toast } from "sonner"

import {
  IntakeReviewProvider,
  type ReviewData,
} from "@/components/doctor/review/intake-review-context"
import {
  formatClinicalNoteContent,
  findClinicalNoteDraft,
  isConcerningValue,
  MIN_CLINICAL_NOTES_LENGTH,
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
  const router = useRouter()
  useAuth()
  const { closePanel } = usePanel()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [doctorNotes, setDoctorNotes] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  // Certificate preview
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isViewingCert, setIsViewingCert] = useState(false)

  // Lock warning
  const [lockWarning, setLockWarning] = useState<string | null>(null)

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const viewStartTime = useRef<number>(Date.now())
  const hasInitialized = useRef(false)

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

          // Pre-fill clinical notes from AI draft if doctor hasn't written notes yet
          const existingNotes = reviewData.intake.doctor_notes || ""
          if (!existingNotes && reviewData.aiDrafts) {
            const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts)
            if (clinicalDraft) {
              const formatted = formatClinicalNoteContent(clinicalDraft.content)
              if (formatted) {
                setDoctorNotes(formatted)
                setIsAiPrefilled(true)
              } else {
                setDoctorNotes("")
              }
            } else {
              setDoctorNotes("")
            }
          } else {
            setDoctorNotes(existingNotes)
          }

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

  // Audit logging + lock management (runs once after data loads)
  useEffect(() => {
    if (!data || hasInitialized.current) return
    hasInitialized.current = true

    const intake = data.intake
    const service = intake.service as { type?: string } | undefined

    // Log clinician viewed intake answers
    logViewedIntakeAnswersAction(intake.id, service?.type)

    // Log safety flags view if present
    const flagAnswers = intake.answers?.answers as Record<string, unknown> | undefined
    if (flagAnswers?.red_flags_detected || flagAnswers?.yellow_flags_detected || flagAnswers?.emergency_symptoms) {
      logViewedSafetyFlagsAction(intake.id, service?.type)
    }

    // Acquire soft lock
    acquireIntakeLockAction(intake.id).then((result) => {
      if (result.warning) {
        setLockWarning(result.warning)
      }
    })

    // Extend lock periodically
    const lockInterval = setInterval(() => {
      extendIntakeLockAction(intake.id)
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(lockInterval)
      releaseIntakeLockAction(intake.id)
    }
  }, [data])

  // Handle panel close — release lock + log view duration
  const handlePanelClose = useCallback(() => {
    if (data) {
      const duration = Date.now() - viewStartTime.current
      navigator.sendBeacon?.(
        "/api/doctor/log-view-duration",
        JSON.stringify({ intakeId: data.intake.id, durationMs: duration })
      )
      releaseIntakeLockAction(data.intake.id)
    }
  }, [data])

  // Computed values from data
  const intake = data?.intake
  const service = intake?.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = (intake?.answers?.answers || {}) as Record<string, unknown>
  const intakeAnswers = intake?.answers?.answers as Record<string, unknown> | undefined

  // NOTE: emergency_symptoms is a safety-gate toggle ("I am NOT experiencing an emergency" → true),
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

  // Close panel + refresh queue
  const closeAndRefresh = useCallback(() => {
    closePanel()
    onActionComplete?.()
    router.refresh()
  }, [closePanel, onActionComplete, router])

  // Decline reason template auto-fill
  const handleDeclineReasonCodeChange = (code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)?.template || ""
    setDeclineReason(template)
  }

  // --- Actions ---

  const handleMedCertApprove = async () => {
    if (!intake || !data) return

    if (hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }
    if (doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    setIsLoadingPreview(true)
    try {
      const result = await fetchCertPreviewDataAction(intake.id, data.draftId || "")
      if (result.success && result.data) {
        setCertPreviewData(result.data)
        setShowCertPreview(true)
      } else {
        toast.error(result.error || "Failed to load certificate data")
      }
    } catch {
      toast.error("Failed to load certificate preview")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleCertPreviewConfirm = async (editedData: CertificatePreviewData) => {
    if (!intake) return
    startTransition(async () => {
      await saveDoctorNotesAction(intake.id, doctorNotes)
      const result = await approveWithPreviewDataAction(intake.id, {
        startDate: editedData.startDate,
        endDate: editedData.endDate,
        medicalReason: editedData.medicalReason,
        doctorName: editedData.doctorName,
        consultDate: editedData.consultDate,
      })
      if (result.success) {
        setShowCertPreview(false)
        const emailNote =
          result.emailStatus === "sent"
            ? "Certificate approved and sent to patient."
            : "Certificate approved. Email will be sent shortly."
        toast.success(emailNote)
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to approve certificate")
      }
    })
  }

  const handleStatusChange = async (status: IntakeStatus) => {
    if (!intake) return

    if ((status === "approved" || status === "awaiting_script") && hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }
    if ((status === "approved" || status === "awaiting_script") && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    startTransition(async () => {
      if (status === "approved" || status === "awaiting_script") {
        await saveDoctorNotesAction(intake.id, doctorNotes)
      }
      const result = await updateStatusAction(intake.id, status)
      if (result.success) {
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleDecline = async () => {
    if (!intake || !declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        toast.success("Case declined and patient notified")
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const hasClinicalDraft = !!findClinicalNoteDraft(data?.aiDrafts || [])

  const handleGenerateOrRegenerateNote = async () => {
    if (!intake) return
    setIsRegenerating(true)
    try {
      const result = await regenerateDrafts(intake.id)
      if (result.success) {
        const res = await fetch(`/api/doctor/intakes/${intake.id}/review-data`)
        if (res.ok) {
          const reviewData: ReviewData = await res.json()
          setData(reviewData)
          const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts || [])
          if (clinicalDraft) {
            const formatted = formatClinicalNoteContent(clinicalDraft.content)
            if (formatted) {
              setDoctorNotes(formatted)
              setIsAiPrefilled(true)
              toast.success(hasClinicalDraft ? "AI note regenerated" : "AI draft generated")
            } else {
              toast.error("AI draft could not be formatted. Please try again.")
            }
          } else {
            toast.error("AI draft could not be generated. Please try again or add your notes manually.")
          }
        } else {
          toast.error("Failed to load draft. Please refresh and try again.")
        }
      } else {
        toast.error(result.error || "Failed to generate draft")
      }
    } catch {
      toast.error("Failed to generate draft")
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!intake) return
    startTransition(async () => {
      const result = await saveDoctorNotesAction(intake.id, doctorNotes)
      if (result.success) {
        setNoteSaved(true)
        setIsAiPrefilled(false) // After saving, it's the doctor's note now
        setTimeout(() => setNoteSaved(false), 3000)
      } else {
        toast.error(result.error || "Failed to save notes")
      }
    })
  }

  const handleResend = async () => {
    if (!intake) return
    setIsResending(true)
    const result = await resendCertificateAdmin(intake.id)
    setIsResending(false)
    if (result.success) {
      toast.success("Certificate email resent to patient")
      const res = await fetch(`/api/doctor/intakes/${intake.id}/review-data`)
      if (res.ok) setData(await res.json())
    } else {
      toast.error(result.error || "Failed to resend certificate")
    }
  }

  const handleViewCertificate = async () => {
    if (!intake) return
    setIsViewingCert(true)
    try {
      const res = await fetch(`/api/doctor/certificates/${intake.id}/download`)
      if (!res.ok) {
        toast.error("Certificate not found")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      // Revoke after a short delay to allow the tab to load
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      toast.error("Failed to load certificate")
    } finally {
      setIsViewingCert(false)
    }
  }

  // Keyboard shortcuts
  useDoctorShortcuts({
    onApprove: () => {
      if (!intake || intake.status !== "paid" || isPending) return
      if (service?.type === "med_certs") {
        handleMedCertApprove()
      } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
        handleStatusChange("awaiting_script")
      } else {
        handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (intake && !["approved", "declined", "completed"].includes(intake.status)) {
        setShowDeclineDialog(true)
      }
    },
    onNote: () => notesRef.current?.focus(),
    onEscape: () => {
      if (showDeclineDialog) {
        setShowDeclineDialog(false)
      } else {
        // Panel escape is handled by SheetPanel itself
      }
    },
    disabled: isPending || isLoading,
  })

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
    doctorNotes,
    setDoctorNotes,
    noteSaved,
    setNoteSaved,
    isAiPrefilled,
    hasClinicalDraft,
    isRegenerating,
    notesRef,
    isPending,
    handleMedCertApprove,
    handleStatusChange,
    handleDecline,
    handleSaveNotes,
    handleGenerateOrRegenerateNote,
    showDeclineDialog,
    setShowDeclineDialog,
    declineReason,
    setDeclineReason,
    declineReasonCode,
    handleDeclineReasonCodeChange,
    isLoadingPreview,
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

            {/* Certificate delivery status — only for approved/completed med certs */}
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
                      disabled={isViewingCert}
                      onClick={handleViewCertificate}
                    >
                      {isViewingCert ? (
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
                      disabled={isResending || (data.certificate.resend_count ?? 0) >= 3}
                      onClick={handleResend}
                      title={(data.certificate.resend_count ?? 0) >= 3 ? "Maximum resends reached" : undefined}
                    >
                      {isResending ? (
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
      {certPreviewData && (
        <CertificatePreviewDialog
          open={showCertPreview}
          onOpenChange={setShowCertPreview}
          data={certPreviewData}
          onConfirm={handleCertPreviewConfirm}
          isPending={isPending}
        />
      )}
    </>
  )
}
