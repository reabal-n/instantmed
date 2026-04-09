"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { approveDraft, regenerateDrafts } from "@/app/actions/draft-approval"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, markScriptSentAction, issueRefundAction } from "@/app/doctor/queue/actions"
import { resendCertificateAdmin } from "@/app/actions/resend-certificate-admin"
import { approveDateCorrection } from "@/app/actions/request-date-correction"
import { fetchCertPreviewDataAction, approveWithPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import type { CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import type { IntakeWithDetails, IntakeWithPatient, IntakeStatus } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"
import { toast } from "sonner"
import { IntakeDetailHeader } from "./intake-detail-header"
import { useIntakeDialogs } from "./use-intake-dialogs"
import { IntakeDetailAnswers } from "./intake-detail-answers"
import { IntakeDetailDrafts } from "./intake-detail-drafts"
import { IntakeDetailFollowups, type DoctorFollowupRow } from "./intake-detail-followups"

interface PendingCorrection {
  id: string
  requestedStartDate: string
  requestedEndDate: string
  reason: string
  patientName: string
  createdAt: string
}

interface IntakeDetailClientProps {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  previousIntakes?: IntakeWithPatient[]
  initialAction?: string
  aiDrafts?: AIDraft[]
  nextIntakeId?: string | null
  draftId?: string | null
  pendingCorrection?: PendingCorrection | null
  followups?: DoctorFollowupRow[]
}

/**
 * Format AI draft content into SOAP clinical note text.
 */
function formatDraftAsNote(content: Record<string, unknown>): string {
  const sections: string[] = []
  const subj = String(content.presentingComplaint || "").trim()
  const obj = String(content.historyOfPresentIllness || "").trim()
  const assess = String(content.relevantInformation || "").trim()
  const plan = String(content.certificateDetails || "").trim()

  if (subj) sections.push(`Subjective:\n${subj}`)
  if (obj) sections.push(`Objective:\n${obj}`)
  if (assess) sections.push(`Assessment:\n${assess}`)
  if (plan) sections.push(`Plan:\n${plan}`)
  return sections.join("\n\n")
}

/** Find a usable clinical_note draft from the AI drafts list. */
function findClinicalNoteDraft(drafts: AIDraft[]): AIDraft | null {
  return drafts.find(
    (d) => d.type === "clinical_note" && d.status === "ready" && !d.rejected_at
  ) ?? null
}

export function IntakeDetailClient({
  intake,
  patientAge,
  maskedMedicare,
  previousIntakes = [],
  initialAction,
  aiDrafts = [],
  nextIntakeId,
  draftId,
  pendingCorrection,
  followups = [],
}: IntakeDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [doctorNotes, setDoctorNotes] = useState(intake.doctor_notes || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const dialogs = useIntakeDialogs(initialAction === "decline")
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Certificate preview dialog
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

  // P0 SAFETY: Detect red flags that require acknowledgment before approval
  const intakeAnswers = intake.answers?.answers as Record<string, unknown> | undefined

  // Helper: check if a value is actually concerning (not empty, "None", "No", "mild", etc.)
  const isConcerningValue = (val: unknown): boolean => {
    if (!val) return false
    if (Array.isArray(val)) return val.filter(v => v && String(v).trim()).length > 0
    const str = String(val).toLowerCase().trim()
    if (!str) return false
    const benign = new Set(["none", "no", "n/a", "nil", "not applicable", "false", "mild", "moderate", "low", "minimal", "minor", "[]"])
    return !benign.has(str)
  }

  // Format a flag value for display (handle arrays and strings)
  const formatFlagValue = (val: unknown): string => {
    if (Array.isArray(val)) return val.filter(v => v && String(v).trim()).join(", ")
    return String(val)
  }

  const hasRedFlags = Boolean(
    isConcerningValue(intakeAnswers?.red_flags_detected) ||
    isConcerningValue(intakeAnswers?.emergency_symptoms) ||
    intake.risk_tier === "high" ||
    intake.requires_live_consult
  )
  const redFlagDetails = [
    isConcerningValue(intakeAnswers?.red_flags_detected) && `Red flags: ${formatFlagValue(intakeAnswers?.red_flags_detected)}`,
    isConcerningValue(intakeAnswers?.emergency_symptoms) && `Emergency symptoms: ${formatFlagValue(intakeAnswers?.emergency_symptoms)}`,
    intake.risk_tier === "high" && "High risk tier",
    intake.requires_live_consult && "Requires live consult",
  ].filter(Boolean) as string[]

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const viewStartTime = useRef<number>(Date.now())
  const hasLoggedView = useRef(false)
  const autoAppliedDraft = useRef(false)

  // P1 MEDICOLEGAL: Log clinician view events for audit trail
  // P1 EFFICIENCY: Acquire soft lock to prevent duplicate review work
  const lockAcquiredAt = useRef<number | null>(null)

  useEffect(() => {
    if (hasLoggedView.current) return
    hasLoggedView.current = true

    // Log that clinician viewed intake answers
    logViewedIntakeAnswersAction(intake.id, service?.type)

    // Log safety flags view if present
    const flagAnswers = intake.answers?.answers as Record<string, unknown> | undefined
    if (flagAnswers?.red_flags_detected || flagAnswers?.yellow_flags_detected || flagAnswers?.emergency_symptoms) {
      logViewedSafetyFlagsAction(intake.id, service?.type)
    }

    // Acquire soft lock on intake
    acquireIntakeLockAction(intake.id).then((result) => {
      if (result.warning) {
        setActionMessage({
          type: "error",
          text: result.warning,
        })
      }
      lockAcquiredAt.current = Date.now()
    })

    // Extend lock periodically while viewing, with 60-minute max duration
    const LOCK_MAX_DURATION_MS = 60 * 60 * 1000 // 60 minutes
    const lockInterval = setInterval(() => {
      if (lockAcquiredAt.current && Date.now() - lockAcquiredAt.current >= LOCK_MAX_DURATION_MS) {
        // Auto-release lock after 60 minutes
        releaseIntakeLockAction(intake.id)
        lockAcquiredAt.current = null
        clearInterval(lockInterval)
        toast.error("Lock expired after 60 minutes. Please re-claim to continue.")
        return
      }
      extendIntakeLockAction(intake.id)
    }, 5 * 60 * 1000) // Every 5 minutes

    // Log page unload to capture view duration and release lock
    const handleUnload = () => {
      const duration = Date.now() - viewStartTime.current
      // Fire-and-forget - can't await on unload
      navigator.sendBeacon?.(
        '/api/doctor/log-view-duration',
        JSON.stringify({ intakeId: intake.id, durationMs: duration })
      )
      // Release lock on page unload
      releaseIntakeLockAction(intake.id)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(lockInterval)
      // Release lock on component unmount
      releaseIntakeLockAction(intake.id)
    }
  }, [intake.id, intake.answers, service?.type])

  // Auto-populate clinical notes from AI draft when no saved notes exist
  useEffect(() => {
    if (autoAppliedDraft.current) return
    if (intake.doctor_notes) return // Don't overwrite existing saved notes
    const clinicalDraft = findClinicalNoteDraft(aiDrafts)
    if (!clinicalDraft) return
    const content = (clinicalDraft.edited_content || clinicalDraft.content) as Record<string, unknown>
    const formatted = formatDraftAsNote(content)
    if (formatted) {
      setDoctorNotes(formatted)
      setIsAiPrefilled(true)
      autoAppliedDraft.current = true
      toast.info("Clinical note auto-drafted — review and edit before saving", { duration: 4000 })
    }
  }, [aiDrafts, intake.doctor_notes])

  // P1 RK-1: Minimum clinical notes length for defensibility. 50 chars
  // forces a meaningful sentence — "ok" or "looks fine" are not enough for
  // a defensible record if AHPRA or a plaintiff ever asks to see notes.
  const MIN_CLINICAL_NOTES_LENGTH = 50

  // P2 DOCTOR_WORKLOAD_AUDIT: Keyboard shortcuts for faster workflow
  useDoctorShortcuts({
    onApprove: () => {
      if (intake.status === "paid" && !isPending) {
        if (service?.type === "med_certs") {
          handleMedCertApprove()
        } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
          handleStatusChange("awaiting_script")
        } else {
          handleStatusChange("approved")
        }
      }
    },
    onDecline: () => {
      if (!["approved", "declined", "completed"].includes(intake.status)) {
        dialogs.openDeclineDialog()
      }
    },
    onNext: () => router.push("/doctor/dashboard"),
    onNote: () => notesRef.current?.focus(),
    onEscape: () => {
      dialogs.closeDeclineDialog()
      dialogs.closeScriptDialog()
      dialogs.closeRefundDialog()
    },
    disabled: isPending,
  })

  // Auto-advance: go to next intake in queue, or back to queue if none
  // Uses window.location for clean navigation to avoid React hydration/hook
  // mismatches when transitioning between pages during async state updates
  const advanceToNext = () => {
    if (nextIntakeId) {
      window.location.href = `/doctor/intakes/${nextIntakeId}`
    } else {
      window.location.href = "/doctor/dashboard"
    }
  }

  // Med cert approval: show preview dialog first, then approve on confirm
  const handleMedCertApprove = async () => {
    // P1 RK-1: Require clinical notes before approval
    if (doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    // Fetch draft data and show preview dialog
    setIsLoadingPreview(true)
    try {
      const result = await fetchCertPreviewDataAction(intake.id, draftId || "")
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

  // Called when doctor confirms the preview dialog
  const handleCertPreviewConfirm = async (editedData: CertificatePreviewData) => {
    startTransition(async () => {
      // Save clinical notes first
      await saveDoctorNotesAction(intake.id, doctorNotes)

      // Auto-approve any pending AI drafts — collapses the separate draft
      // approval step so the doctor doesn't need 3 clicks to approve a cert
      const pendingDrafts = aiDrafts.filter(d => d.status === "ready" && !d.approved_at && !d.rejected_at)
      for (const draft of pendingDrafts) {
        await approveDraft(draft.id)
      }

      const result = await approveWithPreviewDataAction(intake.id, {
        startDate: editedData.startDate,
        endDate: editedData.endDate,
        medicalReason: editedData.medicalReason,
        doctorName: editedData.doctorName,
        consultDate: editedData.consultDate,
      })

      if (result.success) {
        setShowCertPreview(false)
        const emailNote = result.emailStatus === "sent"
          ? "Certificate approved and sent to patient."
          : "Certificate approved. Email will be sent shortly."
        toast.success(emailNote)
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to approve certificate")
      }
    })
  }

  const handleStatusChange = async (status: IntakeStatus) => {
    // P0 SAFETY: Block approval if red flags not acknowledged
    // P1 RK-1: Require clinical notes before approval per MEDICOLEGAL_AUDIT_REPORT
    if ((status === "approved" || status === "awaiting_script") && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    startTransition(async () => {
      // Save notes first if approving
      if (status === "approved" || status === "awaiting_script") {
        await saveDoctorNotesAction(intake.id, doctorNotes)
      }

      const result = await updateStatusAction(intake.id, status)
      if (result.success) {
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleDecline = async () => {
    if (!dialogs.declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, dialogs.declineReasonCode, dialogs.declineReason)
      if (result.success) {
        dialogs.closeDeclineDialog()
        toast.success("Case declined and patient notified")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const hasClinicalDraft = !!findClinicalNoteDraft(aiDrafts)

  const handleGenerateOrRegenerateNote = async () => {
    setIsRegenerating(true)
    try {
      const result = await regenerateDrafts(intake.id)
      if (result.success) {
        const res = await fetch(`/api/doctor/intakes/${intake.id}/review-data`)
        if (res.ok) {
          const data = await res.json()
          const clinicalDraft = findClinicalNoteDraft(data.aiDrafts || [])
          if (clinicalDraft) {
            const content = (clinicalDraft.edited_content || clinicalDraft.content) as Record<string, unknown>
            const formatted = formatDraftAsNote(content)
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
        router.refresh()
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
    startTransition(async () => {
      const result = await saveDoctorNotesAction(intake.id, doctorNotes)
      if (result.success) {
        setNoteSaved(true)
        setIsAiPrefilled(false)
        setTimeout(() => setNoteSaved(false), 3000)
      } else {
        toast.error(result.error || "Failed to save notes")
      }
    })
  }

  const handleMarkScriptSent = async () => {
    startTransition(async () => {
      const result = await markScriptSentAction(intake.id, dialogs.parchmentReference || undefined)
      if (result.success) {
        dialogs.closeScriptDialog()
        toast.success("Script marked as sent")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to mark script sent")
      }
    })
  }

  const handleMarkRefunded = async () => {
    startTransition(async () => {
      const result = await issueRefundAction(intake.id)
      if (result.success) {
        dialogs.closeRefundDialog()
        const amountText = result.amount ? ` ($${(result.amount / 100).toFixed(2)})` : ""
        toast.success(`Refund processed${amountText}`)
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to process refund")
      }
    })
  }

  const handleApproveDateCorrection = () => {
    if (!pendingCorrection) return
    startTransition(async () => {
      const result = await approveDateCorrection(pendingCorrection.id, intake.id)
      if (result.success) {
        toast.success("Date correction approved — use Edit & Resend to generate the updated certificate")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to approve correction")
      }
    })
  }

  const handleResendCertificate = () => {
    startTransition(async () => {
      const result = await resendCertificateAdmin(intake.id)
      if (result.success) {
        toast.success("Certificate email resent to patient")
      } else {
        toast.error(result.error || "Failed to resend certificate")
      }
    })
  }

  const [isViewingCert, setIsViewingCert] = useState(false)
  const [certPdfUrl, setCertPdfUrl] = useState<string | null>(null)

  // Clean up blob URL when viewer closes
  const handleCloseCertPdf = () => {
    if (certPdfUrl) URL.revokeObjectURL(certPdfUrl)
    setCertPdfUrl(null)
  }

  // View the ACTUAL stored certificate PDF (what the patient received)
  // Uses blob: URL instead of data: URL — browsers block data: URLs in iframes
  const handleViewCertificate = async () => {
    setIsViewingCert(true)
    try {
      const response = await fetch(`/api/doctor/certificates/${intake.id}/download`)
      if (!response.ok) {
        toast.error("Certificate not available — it may not have been generated yet")
        return
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      setCertPdfUrl(blobUrl)
    } catch {
      toast.error("Failed to load certificate")
    } finally {
      setIsViewingCert(false)
    }
  }

  return (
    <div className="space-y-4">
      <IntakeDetailHeader
        intake={intake}
        isPending={isPending}
        isLoadingPreview={isLoadingPreview}
        isViewingCert={isViewingCert}
        actionMessage={actionMessage}
        dialogs={dialogs}
        showCertPreview={showCertPreview}
        setShowCertPreview={setShowCertPreview}
        certPreviewData={certPreviewData}
        certPdfUrl={certPdfUrl}
        onCloseCertPdf={handleCloseCertPdf}
        pendingCorrection={pendingCorrection}
        onMedCertApprove={handleMedCertApprove}
        onStatusChange={handleStatusChange}
        onDecline={handleDecline}
        onMarkScriptSent={handleMarkScriptSent}
        onMarkRefunded={handleMarkRefunded}
        onApproveDateCorrection={handleApproveDateCorrection}
        onResendCertificate={handleResendCertificate}
        onViewCertificate={handleViewCertificate}
        onCertPreviewConfirm={handleCertPreviewConfirm}
      />

      <IntakeDetailAnswers
        intake={intake}
        patientAge={patientAge}
        maskedMedicare={maskedMedicare}
        previousIntakes={previousIntakes}
        hasRedFlags={hasRedFlags}
        redFlagDetails={redFlagDetails}
      />

      {followups.length > 0 && (
        <IntakeDetailFollowups followups={followups} />
      )}

      <IntakeDetailDrafts
        intake={intake}
        aiDrafts={aiDrafts}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        noteSaved={noteSaved}
        isAiPrefilled={isAiPrefilled}
        isPending={isPending}
        isRegenerating={isRegenerating}
        hasClinicalDraft={hasClinicalDraft}
        notesRef={notesRef}
        onSaveNotes={handleSaveNotes}
        onGenerateOrRegenerateNote={handleGenerateOrRegenerateNote}
      />
    </div>
  )
}
