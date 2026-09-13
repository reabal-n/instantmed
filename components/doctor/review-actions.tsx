"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { regenerateDrafts } from "@/app/actions/draft-approval"
import { resendCertificateAsStaff } from "@/app/actions/resend-certificate"
import {
  approveWithPreviewDataAction,
  fetchCertPreviewDataAction,
} from "@/app/doctor/intakes/[id]/document/actions"
import {
  approvePrescribedScriptAction,
  declineIntakeAction,
  saveDoctorNotesAction,
  updateStatusAction,
} from "@/app/doctor/queue/actions"
import { showCertApprovalUndoToast } from "@/components/doctor/cert-approval-undo-toast"
import type { CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { ParchmentPrescribePanel } from "@/components/doctor/parchment-prescribe-panel"
import type {
  ReloadReviewData,
  ReviewData,
} from "@/components/doctor/review/intake-review-context"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
} from "@/components/doctor/review/utils"
import { usePanel } from "@/components/panels/panel-provider"
import { playApprovalSound } from "@/lib/audio/approval-sound"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import { isClinicalNoteSufficient, resolveClinicalDecisionNote } from "@/lib/doctor/clinical-notes"
import { DECLINE_REASONS, isAdministrativeClosure, validateDeclineReason } from "@/lib/doctor/constants"
import { createNoteSaveQueue, flushLatestNotes } from "@/lib/doctor/note-save-queue"
import { buildParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"
import { isPrescribingServiceRequest } from "@/lib/doctor/service-types"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import type { DeclineReasonCode, IntakeStatus } from "@/types/db"

// ---- Public interface ----

export interface ReviewActionsState {
  // Transition state
  isPending: boolean

  // Doctor notes
  doctorNotes: string
  setDoctorNotes: (v: string) => void
  /** Set notes from server data, records the baseline so auto-save only fires for doctor edits. */
  setInitialNotes: (notes: string, baselineNotes: string, persisted?: boolean) => void
  noteSaved: boolean
  setNoteSaved: (v: boolean) => void
  /** True while there are unsaved changes pending the 800 ms debounce */
  noteDirty: boolean
  /** Timestamp of the last successful save, drives the "Saved Ns ago" label. Null if never saved this session. */
  savedAt: Date | null
  /** True while an auto-save request is in flight. */
  isAutoSaving: boolean
  /** True if the most recent auto-save attempt failed. */
  autoSaveError: boolean
  isAiPrefilled: boolean
  hasClinicalDraft: boolean
  isRegenerating: boolean
  notesRef: React.RefObject<HTMLTextAreaElement>

  // Decline dialog
  showDeclineDialog: boolean
  setShowDeclineDialog: (v: boolean) => void
  declineReason: string
  setDeclineReason: (v: string) => void
  declineReasonCode: DeclineReasonCode | ""
  setDeclineReasonCode: (code: DeclineReasonCode) => void
  handleDeclineReasonCodeChange: (code: DeclineReasonCode) => void

  // Certificate preview
  showCertPreview: boolean
  setShowCertPreview: (v: boolean) => void
  certPreviewData: CertificatePreviewData | null
  isLoadingPreview: boolean

  // Certificate delivery
  isResending: boolean
  isViewingCert: boolean

  // Handlers
  handleMedCertApprove: () => Promise<void>
  handleCertPreviewConfirm: (editedData: CertificatePreviewData) => Promise<void>
  handleStatusChange: (status: IntakeStatus) => Promise<void>
  handleDecline: () => Promise<void>
  handleSaveNotes: (nextNotes?: string) => Promise<void>
  flushNotes: () => Promise<boolean>
  handleGenerateOrRegenerateNote: () => Promise<void>
  handleOpenParchmentPrescribe: () => void
  handleApprovePrescribedScript: () => Promise<void>
  handleResend: () => Promise<void>
  handleViewCertificate: () => Promise<void>

}

interface UseReviewActionsOptions {
  data: ReviewData | null
  reloadReviewData: ReloadReviewData
  hasRedFlags: boolean
  redFlagsAcknowledged: boolean
  onActionComplete?: (options?: { advance?: boolean }) => void
}

/**
 * Encapsulates all review action logic: approve, decline, notes, cert preview,
 * certificate resend, AI draft generation, and keyboard shortcuts.
 */
export function useReviewActions({
  data,
  reloadReviewData,
  hasRedFlags,
  redFlagsAcknowledged,
  onActionComplete,
}: UseReviewActionsOptions): ReviewActionsState {
  const router = useRouter()
  const { activePanel, closePanel, openPanel } = usePanel()
  const [isPending, setIsPending] = useState(false)
  const decisionPendingRef = useRef(false)

  // Doctor notes
  const [doctorNotes, setDoctorNotesState] = useState("")
  const latestNotesRef = useRef("")
  const noteEditRevisionRef = useRef(0)
  const setDoctorNotes = useCallback((notes: string) => {
    latestNotesRef.current = notes
    setDoctorNotesState(notes)
  }, [])
  const [noteSaved, setNoteSaved] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveError, setAutoSaveError] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  // Autosave baseline: persisted content, or an untouched generated draft.
  const lastSavedNotesRef = useRef<string>("")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteSaveQueueRef = useRef(createNoteSaveQueue(saveDoctorNotesAction))
  const pendingNoteSavesRef = useRef(0)
  const saveFailedRef = useRef(false)
  const persistNotes = useCallback(async (id: string, notes: string) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    pendingNoteSavesRef.current++
    setIsAutoSaving(true)
    try {
      const result = await noteSaveQueueRef.current(id, notes)
      saveFailedRef.current = !result.success
      if (result.success) {
        lastSavedNotesRef.current = notes
        setNoteSaved(true)
        setSavedAt(new Date())
        setAutoSaveError(false)
      } else {
        setAutoSaveError(true)
      }
      return result
    } finally {
      pendingNoteSavesRef.current--
      setIsAutoSaving(pendingNoteSavesRef.current > 0)
    }
  }, [])

  // Baseline suppresses autosave of generated drafts; it is not persistence evidence.
  const setInitialNotes = useCallback((notes: string, baselineNotes: string, persisted = true) => {
    setDoctorNotes(notes)
    lastSavedNotesRef.current = baselineNotes
    setNoteSaved(persisted && notes === baselineNotes)
    setSavedAt(null)
    saveFailedRef.current = false
    setAutoSaveError(false)
  }, [setDoctorNotes])
  const updateDoctorNotes = useCallback((notes: string) => {
    if (decisionPendingRef.current) return
    noteEditRevisionRef.current++
    setDoctorNotes(notes)
    setIsAiPrefilled(false)
  }, [setDoctorNotes])

  // Decline dialog
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode | "">("")

  // Certificate preview
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isViewingCert, setIsViewingCert] = useState(false)
  const intake = data?.intake
  const service = intake?.service as { name?: string; type?: string; short_name?: string } | undefined
  const hasClinicalDraft = !!findClinicalNoteDraft(data?.aiDrafts || [])

  // Auto-save: debounced 800 ms after last keystroke.
  const intakeId = intake?.id
  const intakeStatus = intake?.status

  useEffect(() => {
    setDeclineReason("")
    setDeclineReasonCode("")
  }, [intakeId, showDeclineDialog])

  useEffect(() => {
    if (!intakeId) return
    if (intakeStatus && ["approved", "completed"].includes(intakeStatus)) return
    if (doctorNotes === lastSavedNotesRef.current) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      const snapshot = latestNotesRef.current
      if (snapshot === lastSavedNotesRef.current) return
      // A successful snapshot can make a reverted editor dirty again. Reconcile
      // immediately through the same queue; a failure stops rather than retries.
      void flushLatestNotes(
        () => latestNotesRef.current,
        (notes) => persistNotes(intakeId, notes),
      )
    }, 800)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [doctorNotes, intakeId, intakeStatus, persistNotes])

  const flushCurrentNotes = useCallback(async () => {
    if (!intakeId || (latestNotesRef.current === lastSavedNotesRef.current && pendingNoteSavesRef.current === 0 && !saveFailedRef.current)) return true
    const success = await flushLatestNotes(
      () => latestNotesRef.current,
      (notes) => persistNotes(intakeId, notes),
    )
    if (!success) toast.error("Notes could not be saved. Keep this request open and retry.")
    return success
  }, [intakeId, persistNotes])

  const flushNotes = useCallback(async () => {
    if (decisionPendingRef.current) {
      toast.info("Wait for the current decision before leaving this request.")
      return false
    }
    const saved = await flushCurrentNotes()
    // A decision may have started while this navigation waited for its save.
    if (decisionPendingRef.current) {
      toast.info("Wait for the current decision before leaving this request.")
      return false
    }
    return saved
  }, [flushCurrentNotes])

  // React 18 transitions do not hold pending across awaits. Keep this clinical
  // decision boundary explicit: freeze editing, flush, then run the existing action.
  const runReviewDecision = async (decision: () => Promise<void>) => {
    if (decisionPendingRef.current) return
    decisionPendingRef.current = true
    setIsPending(true)
    try {
      if (!await flushCurrentNotes()) return
      await decision()
    } catch {
      toast.error("Could not confirm the decision. Check this request’s status before trying again.")
    } finally {
      decisionPendingRef.current = false
      setIsPending(false)
    }
  }

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (latestNotesRef.current !== lastSavedNotesRef.current || pendingNoteSavesRef.current > 0 || saveFailedRef.current || decisionPendingRef.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [doctorNotes, isAutoSaving])

  // ---- Helpers ----

  const closeAndRefresh = useCallback(() => {
    closePanel()
    if (onActionComplete) {
      onActionComplete({ advance: true })
    }
    if (!onActionComplete) router.refresh()
  }, [closePanel, onActionComplete, router])

  const handleDeclineReasonCodeChange = (code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)?.template || ""
    setDeclineReason(template)
  }

  const getClinicalCaseSummary = useCallback(() => {
    if (!intake) return null
    const answers = (intake.answers?.answers || {}) as Record<string, unknown>
    return buildClinicalCaseSummary({
      answers,
      category: intake.category,
      subtype: intake.subtype,
      serviceType: service?.type,
      patientName: intake.patient.full_name,
      patientDateOfBirth: intake.patient.date_of_birth ?? null,
      patientSex: intake.patient.sex ?? null,
      riskTier: intake.risk_tier,
      requiresLiveConsult: intake.requires_live_consult,
      scriptSent: intake.script_sent,
    })
  }, [intake, service?.type])

  const openParchmentPanel = useCallback(async () => {
    if (!intake || !await flushNotes()) return
    openPanel({
      id: `parchment-prescribe-${intake.id}`,
      type: "sheet",
      component: (
        <ParchmentPrescribePanel
          intakeId={intake.id}
          patientName={intake.patient?.full_name || "Patient"}
          patientProfileHref={intake.patient?.id ? buildStaffPatientHref(intake.patient.id) : undefined}
          prescriptionContext={buildParchmentPrescriptionContext(getClinicalCaseSummary(), {
            category: intake.category,
            subtype: intake.subtype,
            serviceType: service?.type,
            answers: (intake.answers?.answers || {}) as Record<string, unknown>,
          })}
          onIntakeRefresh={reloadReviewData}
          onClose={activePanel ? () => openPanel(activePanel) : undefined}
        />
      ),
    })
  }, [activePanel, flushNotes, getClinicalCaseSummary, intake, openPanel, reloadReviewData, service?.type])

  const resolveDecisionNote = useCallback(() => {
    if (isClinicalNoteSufficient(latestNotesRef.current)) return latestNotesRef.current
    const caseSummary = getClinicalCaseSummary()
    if (!caseSummary) return null

    return resolveClinicalDecisionNote({
      doctorNotes,
      fallbackDraftNote: caseSummary.draftNote,
    })
  }, [doctorNotes, getClinicalCaseSummary])

  // ---- Action handlers ----

  const handleMedCertApprove = async () => {
    if (!intake || !data) return

    if (hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }
    const decisionNote = resolveDecisionNote()
    if (!decisionNote) {
      toast.error("Use the draft note or add a brief clinical note.")
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
    await runReviewDecision(async () => {
      const decisionNote = resolveDecisionNote()
      if (!decisionNote) {
        toast.error("Use the draft note or add a brief clinical note.")
        notesRef.current?.focus()
        return
      }
      const noteResult = await persistNotes(intake.id, decisionNote)
      if (!noteResult.success) {
        toast.error(noteResult.error || "Failed to save clinical notes")
        return
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
        playApprovalSound()

        // Deferred send path: pop the countdown Undo toast and let the
        // dispatcher fire the email after the window. We still advance the
        // queue because the approval is committed; the doctor can undo
        // without scrolling back.
        if (result.emailStatus === "scheduled" && result.emailScheduledFor) {
          showCertApprovalUndoToast({
            intakeId: intake.id,
            scheduledFor: result.emailScheduledFor,
            patientName: intake.patient?.full_name || undefined,
            onUndone: () => router.refresh(),
          })
        } else {
          const emailNote =
            result.emailStatus === "sent"
              ? result.emailSentTo
                ? `Certificate sent to ${result.emailSentTo}`
                : "Certificate approved and sent to patient."
              : "Certificate approved. Email will be sent shortly."
          toast.success(emailNote)
        }
        closeAndRefresh()
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

    const decisionNote = status === "approved" || status === "awaiting_script"
      ? resolveDecisionNote()
      : null
    if ((status === "approved" || status === "awaiting_script") && !decisionNote) {
      toast.error("Use the draft note or add a brief clinical note.")
      notesRef.current?.focus()
      return
    }

    await runReviewDecision(async () => {
      if ((status === "approved" || status === "awaiting_script") && decisionNote) {
        const saveResult = await persistNotes(intake.id, decisionNote)
        if (!saveResult.success) {
          toast.error(saveResult.error || "Failed to save clinical notes")
          return
        }
        lastSavedNotesRef.current = decisionNote
        setDoctorNotes(decisionNote)
        setNoteSaved(true)
        setSavedAt(new Date())
        setAutoSaveError(false)
        setIsAiPrefilled(false)
      }
      const result = await updateStatusAction(intake.id, status)
      if (result.success) {
        if (status === "approved" || status === "awaiting_script") {
          playApprovalSound()
        }
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        closeAndRefresh()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleOpenParchmentPrescribe = () => {
    openParchmentPanel()
  }

  const handleApprovePrescribedScript = async () => {
    if (!intake) return

    if (hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }

    const decisionNote = resolveDecisionNote()
    if (!decisionNote) {
      toast.error("Use the draft note or add a brief clinical note.")
      notesRef.current?.focus()
      return
    }

    await runReviewDecision(async () => {
      const saveResult = await persistNotes(intake.id, decisionNote)
      if (!saveResult.success) {
        toast.error(saveResult.error || "Failed to save clinical notes")
        return
      }

      const result = await approvePrescribedScriptAction(intake.id)

      if (result.success) {
        lastSavedNotesRef.current = decisionNote
        setDoctorNotes(decisionNote)
        setNoteSaved(true)
        setSavedAt(new Date())
        setAutoSaveError(false)
        setIsAiPrefilled(false)
        playApprovalSound()
        toast.success(
          result.emailNotification === "sent"
            ? "Prescription approved and patient notified"
            : result.emailNotification === "queued"
              ? "Prescription approved. Patient notification is queued."
            : result.emailNotification === "failed"
              ? "Prescription approved. Patient notification needs follow-up."
              : "Prescription approved",
        )
        closeAndRefresh()
      } else {
        toast.error(result.error || "Failed to approve prescription")
      }
    })
  }

  const handleDecline = async () => {
    if (!intake || intake.script_sent === true || validateDeclineReason(declineReasonCode, declineReason)) return
    await runReviewDecision(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        toast.success(isAdministrativeClosure(declineReasonCode) ? "Request closed" : "Request declined")
        if (result.refund?.status === "failed") toast.error("Refund needs attention. Check payment recovery.")
        closeAndRefresh()
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const handleGenerateOrRegenerateNote = async () => {
    if (!intake) return
    if (!await flushNotes()) return
    const generationRevision = noteEditRevisionRef.current
    setIsRegenerating(true)
    try {
      const result = await regenerateDrafts(intake.id)
      if (result.success) {
        const reviewData = await reloadReviewData({ background: true })
        if (reviewData) {
          const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts || [])
          if (clinicalDraft) {
            const formatted = formatClinicalNoteContent(clinicalDraft.content)
            if (formatted && noteEditRevisionRef.current === generationRevision) {
              setInitialNotes(formatted, formatted, false)
              setIsAiPrefilled(true)
              setNoteSaved(false)
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

  const handleSaveNotes = async (nextNotes?: string) => {
    if (!intake) return
    if (nextNotes !== undefined) updateDoctorNotes(nextNotes)
    const success = await flushLatestNotes(
      () => latestNotesRef.current,
      (notes) => persistNotes(intake.id, notes),
    )
    if (!success) toast.error("Notes could not be saved. Keep this request open and retry.")
  }

  const handleResend = async () => {
    if (!intake) return
    setIsResending(true)
    const result = await resendCertificateAsStaff(intake.id)
    setIsResending(false)
    if (result.success) {
      if (result.queued) {
        toast.info("Certificate email queued for delivery")
      } else {
        toast.success("Certificate email resent to patient")
      }
      await reloadReviewData({ background: true })
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
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      toast.error("Failed to load certificate")
    } finally {
      setIsViewingCert(false)
    }
  }

  // ---- Keyboard shortcuts ----

  useDoctorShortcuts({
    onApprove: () => {
      if (!intake || intake.status !== "paid" || isPending) return
      const caseSummary = getClinicalCaseSummary()
      const hasPrescriptionIntent = Boolean(caseSummary?.prescriptionIntent)
      if (service?.type === "med_certs") {
        handleMedCertApprove()
      } else if (isPrescribingServiceRequest(service?.type, intake.subtype)) {
        if (hasPrescriptionIntent) handleOpenParchmentPrescribe()
      } else {
        handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (
        intake &&
        intake.script_sent !== true &&
        !["approved", "declined", "completed"].includes(intake.status)
      ) {
        setShowDeclineDialog(true)
      }
    },
    onNote: () => notesRef.current?.focus(),
    onEscape: () => {
      if (showDeclineDialog) {
        setShowDeclineDialog(false)
      }
    },
    disabled: isPending || !data,
  })

  return {
    isPending,
    doctorNotes,
    setDoctorNotes: updateDoctorNotes,
    setInitialNotes,
    noteSaved,
    setNoteSaved,
    noteDirty: doctorNotes !== lastSavedNotesRef.current,
    savedAt,
    isAutoSaving,
    autoSaveError,
    isAiPrefilled,
    hasClinicalDraft,
    isRegenerating,
    notesRef,
    showDeclineDialog: showDeclineDialog && intake?.script_sent !== true,
    setShowDeclineDialog,
    declineReason,
    setDeclineReason,
    declineReasonCode,
    setDeclineReasonCode,
    handleDeclineReasonCodeChange,
    showCertPreview,
    setShowCertPreview,
    certPreviewData,
    isLoadingPreview,
    isResending,
    isViewingCert,
    handleMedCertApprove,
    handleCertPreviewConfirm,
    handleStatusChange,
    handleDecline,
    handleSaveNotes,
    flushNotes,
    handleGenerateOrRegenerateNote,
    handleOpenParchmentPrescribe,
    handleApprovePrescribedScript,
    handleResend,
    handleViewCertificate,
  }
}
