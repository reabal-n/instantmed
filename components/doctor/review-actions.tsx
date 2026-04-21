"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { regenerateDrafts } from "@/app/actions/draft-approval"
import { resendCertificateAdmin } from "@/app/actions/resend-certificate-admin"
import {
  approveWithPreviewDataAction,
  fetchCertPreviewDataAction,
} from "@/app/doctor/intakes/[id]/document/actions"
import { declineIntakeAction,saveDoctorNotesAction } from "@/app/doctor/queue/actions"
import { updateStatusAction } from "@/app/doctor/queue/actions"
import type { CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import type { ReviewData } from "@/components/doctor/review/intake-review-context"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
  MIN_CLINICAL_NOTES_LENGTH,
} from "@/components/doctor/review/utils"
import { usePanel } from "@/components/panels/panel-provider"
import { playApprovalSound } from "@/lib/audio/approval-sound"
import { DECLINE_REASONS } from "@/lib/doctor/constants"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import type { DeclineReasonCode,IntakeStatus } from "@/types/db"

// ---- Public interface ----

export interface ReviewActionsState {
  // Transition state
  isPending: boolean

  // Doctor notes
  doctorNotes: string
  setDoctorNotes: (v: string) => void
  /** Set notes from server data — records the baseline so auto-save only fires for doctor edits. */
  setInitialNotes: (notes: string, dbNotes: string) => void
  noteSaved: boolean
  setNoteSaved: (v: boolean) => void
  /** True while there are unsaved changes pending the 2.5 s debounce */
  noteDirty: boolean
  isAiPrefilled: boolean
  hasClinicalDraft: boolean
  isRegenerating: boolean
  notesRef: React.RefObject<HTMLTextAreaElement>

  // Decline dialog
  showDeclineDialog: boolean
  setShowDeclineDialog: (v: boolean) => void
  declineReason: string
  setDeclineReason: (v: string) => void
  declineReasonCode: DeclineReasonCode
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
  handleSaveNotes: () => Promise<void>
  handleGenerateOrRegenerateNote: () => Promise<void>
  handleResend: () => Promise<void>
  handleViewCertificate: () => Promise<void>
}

interface UseReviewActionsOptions {
  data: ReviewData | null
  setData: (d: ReviewData) => void
  hasRedFlags: boolean
  redFlagsAcknowledged: boolean
  onActionComplete?: () => void
}

/**
 * Encapsulates all review action logic: approve, decline, notes, cert preview,
 * certificate resend, AI draft generation, and keyboard shortcuts.
 */
export function useReviewActions({
  data,
  setData,
  hasRedFlags,
  redFlagsAcknowledged,
  onActionComplete,
}: UseReviewActionsOptions): ReviewActionsState {
  const router = useRouter()
  const { closePanel } = usePanel()
  const [isPending, startTransition] = useTransition()

  // Doctor notes
  const [doctorNotes, setDoctorNotes] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  // Tracks the last content successfully persisted to DB so we only auto-save diffs.
  const lastSavedNotesRef = useRef<string>("")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load notes from server without triggering auto-save for unchanged content.
  // Pass dbNotes="" for AI-draft prefills (not yet in DB → auto-save will persist them).
  const setInitialNotes = useCallback((notes: string, dbNotes: string) => {
    setDoctorNotes(notes)
    lastSavedNotesRef.current = dbNotes
  }, [])

  // Decline dialog
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

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

  // Auto-save: debounced 2.5 s after last keystroke.
  const intakeId = intake?.id
  const intakeStatus = intake?.status
  useEffect(() => {
    if (!intakeId) return
    if (intakeStatus && ["approved", "completed", "awaiting_script"].includes(intakeStatus)) return
    if (doctorNotes === lastSavedNotesRef.current) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const snapshot = doctorNotes
      if (snapshot === lastSavedNotesRef.current) return
      const result = await saveDoctorNotesAction(intakeId, snapshot)
      if (result.success) {
        lastSavedNotesRef.current = snapshot
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 2000)
      }
    }, 2500)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [doctorNotes, intakeId, intakeStatus])

  // ---- Helpers ----

  const closeAndRefresh = useCallback(() => {
    closePanel()
    onActionComplete?.()
    router.refresh()
  }, [closePanel, onActionComplete, router])

  const handleDeclineReasonCodeChange = (code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)?.template || ""
    setDeclineReason(template)
  }

  // ---- Action handlers ----

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
        playApprovalSound()
        toast.success(emailNote)
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

  const handleDecline = async () => {
    if (!intake || !declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        toast.success("Case declined and patient notified")
        closeAndRefresh()
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

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
        lastSavedNotesRef.current = doctorNotes
        setNoteSaved(true)
        setIsAiPrefilled(false)
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
      }
    },
    disabled: isPending || !data,
  })

  return {
    isPending,
    doctorNotes,
    setDoctorNotes,
    setInitialNotes,
    noteSaved,
    setNoteSaved,
    noteDirty: doctorNotes !== lastSavedNotesRef.current,
    isAiPrefilled,
    hasClinicalDraft,
    isRegenerating,
    notesRef,
    showDeclineDialog,
    setShowDeclineDialog,
    declineReason,
    setDeclineReason,
    declineReasonCode,
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
    handleGenerateOrRegenerateNote,
    handleResend,
    handleViewCertificate,
  }
}
