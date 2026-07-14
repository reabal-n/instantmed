"use client"

import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import { CertificatePreviewDialog } from "@/components/doctor/certificate-preview-dialog"
import { useReviewData } from "@/components/doctor/hooks/use-review-data"
import { IntakeFlagsPanel } from "@/components/doctor/intake-flags-panel"
import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientProfilePanel } from "@/components/doctor/patient-profile-panel"
import { DeclineIntakeDialog } from "@/components/doctor/review/decline-intake-dialog"
import { IntakeReviewCockpit } from "@/components/doctor/review/intake-review-cockpit"
import {
  type IntakeReviewContextValue,
  IntakeReviewProvider,
  type ReviewData,
} from "@/components/doctor/review/intake-review-context"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import {
  findClinicalNoteDraft,
  formatClinicalNoteContent,
  formatDate,
  getStatusColor,
  isConcerningValue,
} from "@/components/doctor/review/utils"
import { useReviewActions } from "@/components/doctor/review-actions"
import { usePanel } from "@/components/panels/panel-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { parseIntakeFlags } from "@/lib/clinical/intake-flags"
import { buildDoctorIntakeHref, STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import type { CertDeliveryStatus } from "@/lib/data/issued-certificates"
import type { PatientThreadMessage } from "@/lib/data/patient-messages"
import { isPrescribingServiceRequest } from "@/lib/doctor/service-types"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import type { IntakeWithDetails, IntakeWithPatient, PatientNote } from "@/types/db"

import { IntakeDetailAnswers } from "./intake-detail-answers"
import { IntakeDetailDrafts } from "./intake-detail-drafts"
import { type DoctorFollowupRow, IntakeDetailFollowups } from "./intake-detail-followups"
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
  patientNotes?: PatientNote[]
  backHref?: string
  backLabel?: string
  supplementaryActions?: ReactNode
  compact?: boolean
}

function mapCertDeliveryToReviewCertificate(
  intakeId: string,
  certDelivery?: CertDeliveryStatus | null,
): ReviewData["certificate"] {
  if (!certDelivery) return null

  return {
    id: intakeId,
    email_sent_at: certDelivery.emailSentAt,
    email_failed_at: certDelivery.emailFailedAt,
    email_failure_reason: certDelivery.emailFailureReason,
    email_opened_at: certDelivery.emailOpenedAt,
    resend_count: certDelivery.resendCount,
  }
}

function getRedFlagDetails(
  intake: IntakeWithDetails,
  intakeAnswers: Record<string, unknown> | undefined,
): string[] {
  return [
    isConcerningValue(intakeAnswers?.red_flags_detected) && `Red flags: ${intakeAnswers?.red_flags_detected}`,
    intake.risk_tier === "high" && "High risk tier",
    intake.requires_live_consult && "Requires live consult",
  ].filter(Boolean) as string[]
}

function CockpitIntakeDetailClient({
  intake,
  patientAge,
  maskedMedicare,
  previousIntakes = [],
  aiDrafts = [],
  nextIntakeId,
  draftId,
  certDelivery,
  patientMessages = [],
  patientNotes = [],
  initialAction,
  backHref = STAFF_DASHBOARD_HREF,
  backLabel = "Back to queue",
  supplementaryActions,
}: IntakeDetailClientProps) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)
  const initialReviewData = useMemo<ReviewData>(() => ({
    intake,
    patientAge,
    maskedMedicare,
    aiDrafts,
    nextIntakeId: nextIntakeId ?? null,
    previousIntakes,
    previousIntakeCount: previousIntakes.length,
    patientNotes,
    patientMessages,
    draftId: draftId ?? null,
    certificate: mapCertDeliveryToReviewCertificate(intake.id, certDelivery),
  }), [
    aiDrafts,
    certDelivery,
    draftId,
    intake,
    maskedMedicare,
    nextIntakeId,
    patientAge,
    patientMessages,
    patientNotes,
    previousIntakes,
  ])
  const {
    data: reviewDataState,
    refreshError,
    isRefreshing,
    reloadReviewData,
  } = useReviewData({ intakeId: intake.id, initialData: initialReviewData })
  const reviewData = reviewDataState ?? initialReviewData
  const autoGeneratedRef = useRef(false)
  const initialActionHandledRef = useRef(false)
  const service = reviewData.intake.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = (reviewData.intake.answers?.answers || {}) as Record<string, unknown>
  const intakeAnswers = reviewData.intake.answers?.answers as Record<string, unknown> | undefined
  const redFlagDetails = getRedFlagDetails(reviewData.intake, intakeAnswers)
  const hasRedFlags = redFlagDetails.length > 0

  const actions = useReviewActions({
    data: reviewData,
    reloadReviewData,
    hasRedFlags,
    redFlagsAcknowledged,
    onActionComplete: (options) => {
      if (!options?.advance) {
        void reloadReviewData({ background: true })
        return
      }
      if (nextIntakeId) {
        router.push(buildDoctorIntakeHref(nextIntakeId))
        return
      }
      router.push(STAFF_DASHBOARD_HREF)
    },
  })

  const shouldRefreshPendingFulfilment =
    reviewData.intake.script_sent !== true &&
    isPrescribingServiceRequest(service?.type, reviewData.intake.subtype)

  useEffect(() => {
    if (!shouldRefreshPendingFulfilment) return
    const refreshOnFocus = () => void reloadReviewData({ background: true })
    window.addEventListener("focus", refreshOnFocus)
    return () => window.removeEventListener("focus", refreshOnFocus)
  }, [reloadReviewData, shouldRefreshPendingFulfilment])

  useEffect(() => {
    const existingNotes = reviewData.intake.doctor_notes || ""
    const isReviewable = !["approved", "completed", "awaiting_script", "declined"].includes(reviewData.intake.status)
    if (!existingNotes && reviewData.aiDrafts) {
      const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts)
      if (clinicalDraft) {
        const formatted = formatClinicalNoteContent(clinicalDraft.content)
        actions.setInitialNotes(formatted || "", formatted || "")
      } else {
        actions.setInitialNotes("", "")
        if (isReviewable && !autoGeneratedRef.current) {
          autoGeneratedRef.current = true
          actions.handleGenerateOrRegenerateNote()
        }
      }
    } else {
      actions.setInitialNotes(existingNotes, existingNotes)
    }
    // Only run once after initial full-page data is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialAction === "decline" && !initialActionHandledRef.current) {
      initialActionHandledRef.current = true
      actions.setShowDeclineDialog(true)
    }
  }, [actions, initialAction])

  const contextValue: IntakeReviewContextValue = {
    data: reviewData,
    intake: reviewData.intake,
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

  return (
    <>
      <IntakeReviewProvider value={contextValue}>
        <div className="flex flex-col gap-3 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className={getStatusColor(reviewData.intake.status)}>
                {formatIntakeStatus(reviewData.intake.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {(service?.short_name || formatServiceType(service?.type || ""))} · {reviewData.intake.reference_number || reviewData.intake.id}
              </span>
            </div>
          </div>

          {refreshError ? (
            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-xs font-medium text-warning"
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
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </div>
          ) : null}

          <PatientDecisionStrip
            intake={reviewData.intake}
            answers={answers}
            previousIntakes={reviewData.previousIntakes ?? []}
            previousIntakeCount={reviewData.previousIntakeCount}
            service={service}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    openPanel({
                      id: `detail-patient-profile-${reviewData.intake.patient.id}`,
                      type: "drawer",
                      component: (
                        <PatientProfilePanel
                          patient={reviewData.intake.patient}
                          answers={answers}
                          serviceContext={{
                            category: reviewData.intake.category,
                            serviceType: service?.type,
                            subtype: reviewData.intake.subtype,
                          }}
                          sourceLabel={reviewData.intake.reference_number || "Current case"}
                        />
                      ),
                    })
                  }}
                >
                  View profile
                </Button>
                {supplementaryActions}
              </>
            }
          />

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <IntakeFlagsPanel
              flags={parseIntakeFlags((reviewData.intake as { risk_flags?: unknown }).risk_flags)}
              className="mb-3"
              hideRequestFieldFlags
            />
            <IntakeReviewCockpit />
          </div>
        </div>
      </IntakeReviewProvider>

      <IntakeReviewProvider value={contextValue}>
        <DeclineIntakeDialog />
      </IntakeReviewProvider>

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

export function IntakeDetailClient(props: IntakeDetailClientProps) {
  if (props.compact) {
    return <CockpitIntakeDetailClient {...props} />
  }

  return <LegacyIntakeDetailClient {...props} />
}

function LegacyIntakeDetailClient({
  intake: initialIntake,
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
  patientNotes = [],
  backHref = STAFF_DASHBOARD_HREF,
  backLabel = "Back to queue",
  supplementaryActions,
  compact = false,
}: IntakeDetailClientProps) {
  const initialReviewData = useMemo<ReviewData>(() => ({
    intake: initialIntake,
    patientAge,
    maskedMedicare,
    aiDrafts,
    nextIntakeId: nextIntakeId ?? null,
    previousIntakes,
    previousIntakeCount: previousIntakes.length,
    patientNotes,
    patientMessages,
    draftId: draftId ?? null,
    certificate: mapCertDeliveryToReviewCertificate(initialIntake.id, certDelivery),
  }), [
    aiDrafts,
    certDelivery,
    draftId,
    initialIntake,
    maskedMedicare,
    nextIntakeId,
    patientAge,
    patientMessages,
    patientNotes,
    previousIntakes,
  ])
  const { data: reviewData, reloadReviewData } = useReviewData({
    intakeId: initialIntake.id,
    initialData: initialReviewData,
  })
  const intake = reviewData?.intake ?? initialIntake
  const dialogs = useIntakeDialogs(initialAction === "decline")
  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

  const actions = useIntakeActions({
    intake,
    aiDrafts,
    nextIntakeId,
    draftId,
    dialogs,
    parchmentEnabled,
    reloadReviewData,
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
        patientDateOfBirth: intake.patient?.date_of_birth ?? null,
        patientSex: intake.patient?.sex ?? null,
        answers: intakeAnswers ?? {},
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
        scriptSent: intake.script_sent,
      }),
    [
      intake.category,
      intake.patient?.full_name,
      intake.patient?.date_of_birth,
      intake.patient?.sex,
      intake.requires_live_consult,
      intake.script_sent,
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
        if (service?.type === "med_certs") {
          actions.handleMedCertApprove()
        } else if (isPrescribingServiceRequest(service?.type, intake.subtype)) {
          if (hasPrescriptionIntent) actions.handleOpenParchmentPrescribe?.()
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

  const answersProps = {
    intake,
    patientAge,
    maskedMedicare,
    previousIntakes,
    hasRedFlags,
    redFlagDetails,
    compact,
  }

  return (
    <div className={compact ? "flex flex-col gap-3 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden" : "space-y-4"}>
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
        onRejectDateCorrection={() => actions.handleRejectDateCorrection(pendingCorrection ?? null)}
        onResendCertificate={actions.handleResendCertificate}
        onViewCertificate={actions.handleViewCertificate}
        onCertPreviewConfirm={actions.handleCertPreviewConfirm}
        onOpenParchmentPrescribe={actions.handleOpenParchmentPrescribe}
        onApprovePrescribedScript={actions.handleApprovePrescribedScript}
        hasPrescriptionIntent={hasPrescriptionIntent}
        isAiPrefilled={actions.isAiPrefilled}
        noteDirty={actions.noteDirty}
        showReissueDialog={dialogs.showReissueDialog}
        setShowReissueDialog={dialogs.setShowReissueDialog}
        reissuePreviewData={dialogs.reissuePreviewData}
        onReissueCertificate={actions.handleReissueCertificate}
        onReissueConfirm={actions.handleReissueConfirm}
        certDelivery={certDelivery}
        doctorNotes={actions.doctorNotes}
        backHref={backHref}
        backLabel={backLabel}
        supplementaryActions={supplementaryActions}
        compact={compact}
      />

      <PatientDecisionStrip
        intake={intake}
        answers={intakeAnswers ?? {}}
        previousIntakes={previousIntakes}
        previousIntakeCount={previousIntakes.length}
        service={service}
      />

      {compact ? (
        <div className="grid gap-3 lg:min-h-0 lg:overflow-hidden xl:grid-cols-[minmax(270px,0.72fr)_minmax(0,1.14fr)_minmax(320px,0.84fr)]">
          <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <IntakeDetailAnswers {...answersProps} section="patient" />

            <PatientMessageThread
              messages={patientMessages}
              infoRequestMessage={intake.info_request_message}
              infoRequestedAt={intake.info_requested_at}
              status={intake.status}
            />

            {followups.length > 0 && (
              <IntakeDetailFollowups followups={followups} />
            )}
          </div>

          <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto">
            <IntakeDetailAnswers {...answersProps} section="request" />
            <IntakeDetailAnswers {...answersProps} section="history" />
          </div>

          <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
            <IntakeDetailDrafts
              intake={intake}
              aiDrafts={aiDrafts}
              doctorNotes={actions.doctorNotes}
              setDoctorNotes={actions.setDoctorNotes}
              noteSaved={actions.noteSaved}
              notesAutoSaving={actions.notesAutoSaving}
              notesAutoSaveError={actions.notesAutoSaveError}
              lastSavedDoctorNotesAt={actions.lastSavedDoctorNotesAt}
              noteDirty={actions.noteDirty}
              isAiPrefilled={actions.isAiPrefilled}
              isPending={actions.isPending}
              isRegenerating={actions.isRegenerating}
              hasClinicalDraft={actions.hasClinicalDraft}
              notesRef={actions.notesRef}
              onSaveNotes={actions.handleSaveNotes}
              onGenerateOrRegenerateNote={actions.handleGenerateOrRegenerateNote}
              compact={compact}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            <IntakeDetailAnswers {...answersProps} />

            <PatientMessageThread
              messages={patientMessages}
              infoRequestMessage={intake.info_request_message}
              infoRequestedAt={intake.info_requested_at}
              status={intake.status}
            />

            {followups.length > 0 && (
              <IntakeDetailFollowups followups={followups} />
            )}
          </div>

          <div className="space-y-4">
            <IntakeDetailDrafts
              intake={intake}
              aiDrafts={aiDrafts}
              doctorNotes={actions.doctorNotes}
              setDoctorNotes={actions.setDoctorNotes}
              noteSaved={actions.noteSaved}
              notesAutoSaving={actions.notesAutoSaving}
              notesAutoSaveError={actions.notesAutoSaveError}
              lastSavedDoctorNotesAt={actions.lastSavedDoctorNotesAt}
              noteDirty={actions.noteDirty}
              isAiPrefilled={actions.isAiPrefilled}
              isPending={actions.isPending}
              isRegenerating={actions.isRegenerating}
              hasClinicalDraft={actions.hasClinicalDraft}
              notesRef={actions.notesRef}
              onSaveNotes={actions.handleSaveNotes}
              onGenerateOrRegenerateNote={actions.handleGenerateOrRegenerateNote}
              compact={compact}
            />
          </div>
        </div>
      )}
    </div>
  )
}
