"use client"

import { useRouter } from "next/navigation"
import { useCallback,useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import type { AIDraft } from "@/app/actions/draft-approval"
import { approveDraft, regenerateDrafts } from "@/app/actions/draft-approval"
import { acquireIntakeLockAction, extendIntakeLockAction,releaseIntakeLockAction } from "@/app/actions/intake-lock"
import { reissueCertificateAction } from "@/app/actions/reissue-cert"
import { approveDateCorrection } from "@/app/actions/request-date-correction"
import { resendCertificateAdmin } from "@/app/actions/resend-certificate-admin"
import { approveWithPreviewDataAction,fetchCertPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import { declineIntakeAction, issueRefundAction,markScriptSentAction, saveDoctorNotesAction, updateStatusAction } from "@/app/doctor/queue/actions"
import type { CertificatePreviewData } from "@/components/doctor"
import { ParchmentPrescribePanel } from "@/components/doctor"
import { MIN_CLINICAL_NOTES_LENGTH } from "@/components/doctor/review/utils"
import { usePanel } from "@/components/panels/panel-provider"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { resolveClinicalDecisionNote } from "@/lib/doctor/clinical-notes"
import type { IntakeStatus,IntakeWithDetails } from "@/types/db"

import type { IntakeDialogState } from "./use-intake-dialogs"

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

interface UseIntakeActionsParams {
  intake: IntakeWithDetails
  aiDrafts: AIDraft[]
  nextIntakeId?: string | null
  draftId?: string | null
  dialogs: IntakeDialogState
  parchmentEnabled: boolean
}

export function useIntakeActions({
  intake,
  aiDrafts,
  nextIntakeId,
  draftId,
  dialogs,
  parchmentEnabled,
}: UseIntakeActionsParams) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [doctorNotes, setDoctorNotes] = useState(intake.doctor_notes || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isViewingCert, setIsViewingCert] = useState(false)
  const [certPdfUrl, setCertPdfUrl] = useState<string | null>(null)

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const viewStartTime = useRef<number>(Date.now())
  const hasLoggedView = useRef(false)
  const autoAppliedDraft = useRef(false)
  const lockAcquiredAt = useRef<number | null>(null)

  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
  const hasClinicalDraft = !!findClinicalNoteDraft(aiDrafts)

  const resolveDecisionNote = useCallback(() => {
    const answers = (intake.answers?.answers || {}) as Record<string, unknown>
    const caseSummary = buildClinicalCaseSummary({
      answers,
      category: intake.category,
      subtype: intake.subtype,
      serviceType: service?.type,
      patientName: intake.patient.full_name,
      riskTier: intake.risk_tier,
      requiresLiveConsult: intake.requires_live_consult,
    })

    return resolveClinicalDecisionNote({
      doctorNotes,
      fallbackDraftNote: caseSummary.draftNote,
    })
  }, [doctorNotes, intake, service?.type])

  // ── Audit logging + lock management ──

  useEffect(() => {
    if (hasLoggedView.current) return
    hasLoggedView.current = true

    logViewedIntakeAnswersAction(intake.id, service?.type)

    const flagAnswers = intake.answers?.answers as Record<string, unknown> | undefined
    if (flagAnswers?.red_flags_detected || flagAnswers?.yellow_flags_detected || flagAnswers?.emergency_symptoms) {
      logViewedSafetyFlagsAction(intake.id, service?.type)
    }

    acquireIntakeLockAction(intake.id).then((result) => {
      if (result.data?.warning) {
        setActionMessage({ type: "error", text: result.data.warning })
      }
      lockAcquiredAt.current = Date.now()
    })

    const LOCK_MAX_DURATION_MS = 60 * 60 * 1000
    const lockInterval = setInterval(() => {
      if (lockAcquiredAt.current && Date.now() - lockAcquiredAt.current >= LOCK_MAX_DURATION_MS) {
        releaseIntakeLockAction(intake.id)
        lockAcquiredAt.current = null
        clearInterval(lockInterval)
        toast.error("Lock expired after 60 minutes. Please re-claim to continue.")
        return
      }
      extendIntakeLockAction(intake.id)
    }, 5 * 60 * 1000)

    const handleUnload = () => {
      const duration = Date.now() - viewStartTime.current
      navigator.sendBeacon?.(
        '/api/doctor/log-view-duration',
        JSON.stringify({ intakeId: intake.id, durationMs: duration })
      )
      releaseIntakeLockAction(intake.id)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(lockInterval)
      releaseIntakeLockAction(intake.id)
    }
  }, [intake.id, intake.answers, service?.type])

  // ── Auto-populate clinical notes from AI draft ──

  useEffect(() => {
    if (autoAppliedDraft.current) return
    if (intake.doctor_notes) return
    const clinicalDraft = findClinicalNoteDraft(aiDrafts)
    if (!clinicalDraft) return
    const content = (clinicalDraft.edited_content || clinicalDraft.content) as Record<string, unknown>
    const formatted = formatDraftAsNote(content)
    if (formatted) {
      setDoctorNotes(formatted)
      setIsAiPrefilled(true)
      autoAppliedDraft.current = true
      toast.info("Clinical note auto-drafted - review and edit before saving", { duration: 4000 })
    }
  }, [aiDrafts, intake.doctor_notes])

  // ── Navigation ──

  const advanceToNext = useCallback(() => {
    if (nextIntakeId) {
      router.push(`/doctor/intakes/${nextIntakeId}`)
    } else {
      router.push("/doctor/dashboard")
    }
    router.refresh()
  }, [nextIntakeId, router])

  // ── Handlers ──

  const handleMedCertApprove = useCallback(async () => {
    if (doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

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
  }, [doctorNotes, intake.id, draftId])

  const handleCertPreviewConfirm = useCallback(async (editedData: CertificatePreviewData) => {
    startTransition(async () => {
      await saveDoctorNotesAction(intake.id, doctorNotes)

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
  }, [intake.id, doctorNotes, aiDrafts, advanceToNext])

  const handleStatusChange = useCallback(async (status: IntakeStatus) => {
    const decisionNote = status === "awaiting_script" ? resolveDecisionNote() : null

    if (status === "approved" && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    if (status === "awaiting_script" && !decisionNote) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    startTransition(async () => {
      if (status === "approved") {
        const saveResult = await saveDoctorNotesAction(intake.id, doctorNotes)
        if (!saveResult.success) {
          toast.error(saveResult.error || "Failed to save clinical notes")
          return
        }
      }

      if (status === "awaiting_script" && decisionNote) {
        const saveResult = await saveDoctorNotesAction(intake.id, decisionNote)
        if (!saveResult.success) {
          toast.error(saveResult.error || "Failed to save clinical notes")
          return
        }
        setDoctorNotes(decisionNote)
        setNoteSaved(true)
        setIsAiPrefilled(false)
      }

      const result = await updateStatusAction(intake.id, status)
      if (result.success) {
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }, [doctorNotes, intake.id, advanceToNext, resolveDecisionNote])

  const handleDecline = useCallback(async () => {
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
  }, [intake.id, dialogs, advanceToNext])

  const handleGenerateOrRegenerateNote = useCallback(async () => {
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
  }, [intake.id, hasClinicalDraft, router])

  const handleSaveNotes = useCallback(async () => {
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
  }, [intake.id, doctorNotes])

  const handleMarkScriptSent = useCallback(async () => {
    startTransition(async () => {
      const result = await markScriptSentAction(intake.id, undefined, dialogs.parchmentReference || undefined)
      if (result.success) {
        dialogs.closeScriptDialog()
        toast.success("Script marked as sent")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to mark script sent")
      }
    })
  }, [intake.id, dialogs, advanceToNext])

  const { openPanel } = usePanel()
  const handleOpenParchmentPrescribe = useCallback(() => {
    if (!parchmentEnabled) return
    openPanel({
      id: `parchment-prescribe-${intake.id}`,
      type: "sheet",
      component: (
        <ParchmentPrescribePanel
          intakeId={intake.id}
          patientName={intake.patient?.full_name || "Patient"}
          onScriptSent={() => {
            dialogs.openScriptDialog()
          }}
        />
      ),
    })
  }, [intake.id, intake.patient?.full_name, parchmentEnabled, openPanel, dialogs])

  const handleMarkRefunded = useCallback(async () => {
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
  }, [intake.id, dialogs, advanceToNext])

  const handleApproveDateCorrection = useCallback((pendingCorrection: { id: string } | null) => {
    if (!pendingCorrection) return
    startTransition(async () => {
      const result = await approveDateCorrection(pendingCorrection.id, intake.id)
      if (result.success) {
        toast.success("Date correction approved - use Edit & Resend to generate the updated certificate")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to approve correction")
      }
    })
  }, [intake.id, router])

  const handleResendCertificate = useCallback(() => {
    startTransition(async () => {
      const result = await resendCertificateAdmin(intake.id)
      if (result.success) {
        toast.success("Certificate email resent to patient")
      } else {
        toast.error(result.error || "Failed to resend certificate")
      }
    })
  }, [intake.id])

  const handleReissueCertificate = useCallback(async () => {
    setIsLoadingPreview(true)
    try {
      const result = await fetchCertPreviewDataAction(intake.id, draftId || "")
      if (result.success && result.data) {
        dialogs.setReissuePreviewData(result.data)
        dialogs.setShowReissueDialog(true)
      } else {
        toast.error(result.error || "Failed to load certificate data")
      }
    } catch {
      toast.error("Failed to load certificate data")
    } finally {
      setIsLoadingPreview(false)
    }
  }, [intake.id, draftId, dialogs])

  const handleReissueConfirm = useCallback(async (editedData: CertificatePreviewData, notifyPatient?: boolean) => {
    startTransition(async () => {
      const result = await reissueCertificateAction({
        intakeId: intake.id,
        patientName: editedData.patientName,
        patientDob: editedData.patientDob,
        certificateType: editedData.certificateType,
        startDate: editedData.startDate,
        endDate: editedData.endDate,
        medicalReason: editedData.medicalReason,
        notifyPatient: notifyPatient ?? false,
      })

      if (result.success) {
        dialogs.setShowReissueDialog(false)
        toast.success("Certificate reissued successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to reissue certificate")
      }
    })
  }, [intake.id, dialogs, router])

  const handleCloseCertPdf = useCallback(() => {
    if (certPdfUrl) URL.revokeObjectURL(certPdfUrl)
    setCertPdfUrl(null)
  }, [certPdfUrl])

  const handleViewCertificate = useCallback(async () => {
    setIsViewingCert(true)
    try {
      const response = await fetch(`/api/doctor/certificates/${intake.id}/download`)
      if (!response.ok) {
        toast.error("Certificate not available - it may not have been generated yet")
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
  }, [intake.id])

  return {
    isPending,
    doctorNotes,
    setDoctorNotes,
    noteSaved,
    isAiPrefilled,
    actionMessage,
    showCertPreview,
    setShowCertPreview,
    certPreviewData,
    isLoadingPreview,
    isRegenerating,
    isViewingCert,
    certPdfUrl,
    notesRef,
    hasClinicalDraft,
    handleMedCertApprove,
    handleCertPreviewConfirm,
    handleStatusChange,
    handleDecline,
    handleGenerateOrRegenerateNote,
    handleSaveNotes,
    handleMarkScriptSent,
    handleOpenParchmentPrescribe: parchmentEnabled ? handleOpenParchmentPrescribe : undefined,
    handleMarkRefunded,
    handleApproveDateCorrection,
    handleResendCertificate,
    handleReissueCertificate,
    handleReissueConfirm,
    handleCloseCertPdf,
    handleViewCertificate,
  }
}
