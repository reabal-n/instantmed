"use client"

import { useMemo } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import type { CertDeliveryStatus } from "@/lib/data/issued-certificates"
import type { PatientThreadMessage } from "@/lib/data/patient-messages"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

import { IntakeDetailAnswers } from "./intake-detail-answers"
import { IntakeDetailDrafts } from "./intake-detail-drafts"
import { type DoctorFollowupRow,IntakeDetailFollowups } from "./intake-detail-followups"
import { IntakeDetailHeader } from "./intake-detail-header"
import { useIntakeActions } from "./use-intake-actions"
import { useIntakeDialogs } from "./use-intake-dialogs"

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
  certDelivery?: CertDeliveryStatus | null
  parchmentEnabled?: boolean
  patientMessages?: PatientThreadMessage[]
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
  certDelivery,
  parchmentEnabled = false,
  patientMessages = [],
}: IntakeDetailClientProps) {
  const dialogs = useIntakeDialogs(initialAction === "decline")
  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

  const actions = useIntakeActions({
    intake,
    aiDrafts,
    nextIntakeId,
    draftId,
    dialogs,
    parchmentEnabled,
  })

  // Red flag detection for the answers section
  const intakeAnswers = intake.answers?.answers as Record<string, unknown> | undefined
  const isConcerningValue = (val: unknown): boolean => {
    if (!val) return false
    if (Array.isArray(val)) return val.filter(v => v && String(v).trim()).length > 0
    const str = String(val).toLowerCase().trim()
    if (!str) return false
    const benign = new Set(["none", "no", "n/a", "nil", "not applicable", "false", "true", "mild", "moderate", "low", "minimal", "minor", "[]"])
    return !benign.has(str)
  }
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
  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient?.full_name,
        answers: intakeAnswers ?? {},
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      intake.category,
      intake.patient?.full_name,
      intake.requires_live_consult,
      intake.risk_tier,
      intake.subtype,
      intakeAnswers,
      service?.type,
    ],
  )
  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)

  // Keyboard shortcuts
  useDoctorShortcuts({
    onApprove: () => {
      if (intake.status === "paid" && !actions.isPending) {
        if (
          intake.category === "consult" &&
          ["ed", "hair_loss"].includes(intake.subtype || "") &&
          hasPrescriptionIntent &&
          actions.handleApproveAndOpenParchment
        ) {
          actions.handleApproveAndOpenParchment()
        } else if (service?.type === "med_certs") {
          actions.handleMedCertApprove()
        } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
          actions.handleStatusChange("awaiting_script")
        } else {
          actions.handleStatusChange("approved")
        }
      }
    },
    onDecline: () => {
      if (!["approved", "declined", "completed"].includes(intake.status)) {
        dialogs.openDeclineDialog()
      }
    },
    onNext: () => void 0, // handled via router in useIntakeActions
    onNote: () => actions.notesRef.current?.focus(),
    onEscape: () => {
      dialogs.closeDeclineDialog()
      dialogs.closeScriptDialog()
      dialogs.closeRefundDialog()
    },
    disabled: actions.isPending,
  })

  return (
    <div className="space-y-4">
      <IntakeDetailHeader
        intake={intake}
        isPending={actions.isPending}
        isLoadingPreview={actions.isLoadingPreview}
        isViewingCert={actions.isViewingCert}
        actionMessage={actions.actionMessage}
        dialogs={dialogs}
        showCertPreview={actions.showCertPreview}
        setShowCertPreview={actions.setShowCertPreview}
        certPreviewData={actions.certPreviewData}
        certPdfUrl={actions.certPdfUrl}
        onCloseCertPdf={actions.handleCloseCertPdf}
        pendingCorrection={pendingCorrection}
        onMedCertApprove={actions.handleMedCertApprove}
        onStatusChange={actions.handleStatusChange}
        onDecline={actions.handleDecline}
        onMarkScriptSent={actions.handleMarkScriptSent}
        onMarkRefunded={actions.handleMarkRefunded}
        onApproveDateCorrection={() => actions.handleApproveDateCorrection(pendingCorrection ?? null)}
        onResendCertificate={actions.handleResendCertificate}
        onViewCertificate={actions.handleViewCertificate}
        onCertPreviewConfirm={actions.handleCertPreviewConfirm}
        onOpenParchmentPrescribe={actions.handleOpenParchmentPrescribe}
        onApproveAndOpenParchment={actions.handleApproveAndOpenParchment}
        hasPrescriptionIntent={hasPrescriptionIntent}
        showReissueDialog={dialogs.showReissueDialog}
        setShowReissueDialog={dialogs.setShowReissueDialog}
        reissuePreviewData={dialogs.reissuePreviewData}
        onReissueCertificate={actions.handleReissueCertificate}
        onReissueConfirm={actions.handleReissueConfirm}
        certDelivery={certDelivery}
      />

      <IntakeDetailAnswers
        intake={intake}
        patientAge={patientAge}
        maskedMedicare={maskedMedicare}
        previousIntakes={previousIntakes}
        hasRedFlags={hasRedFlags}
        redFlagDetails={redFlagDetails}
      />

      <PatientMessageThread
        messages={patientMessages}
        infoRequestMessage={intake.info_request_message}
        infoRequestedAt={intake.info_requested_at}
        status={intake.status}
      />

      {followups.length > 0 && (
        <IntakeDetailFollowups followups={followups} />
      )}

      <IntakeDetailDrafts
        intake={intake}
        aiDrafts={aiDrafts}
        doctorNotes={actions.doctorNotes}
        setDoctorNotes={actions.setDoctorNotes}
        noteSaved={actions.noteSaved}
        isAiPrefilled={actions.isAiPrefilled}
        isPending={actions.isPending}
        isRegenerating={actions.isRegenerating}
        hasClinicalDraft={actions.hasClinicalDraft}
        notesRef={actions.notesRef}
        onSaveNotes={actions.handleSaveNotes}
        onGenerateOrRegenerateNote={actions.handleGenerateOrRegenerateNote}
      />
    </div>
  )
}
