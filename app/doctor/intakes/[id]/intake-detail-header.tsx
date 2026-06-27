"use client"

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Save,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { AttributionChip, CertHealthChip, type CertificatePreviewData, CertificatePreviewDialog, PdfViewerDialog } from "@/components/doctor"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { buildPrescribingPacket, getPrescribingPacketBlocker } from "@/lib/clinical/prescribing-packet"
import { buildDoctorDocumentBuilderHref } from "@/lib/dashboard/routes"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import type { CertDeliveryStatus } from "@/lib/data/issued-certificates"
import { INTAKE_STATUS, type IntakeStatus as StatusType } from "@/lib/data/status"
import { isClinicalNoteSufficient } from "@/lib/doctor/clinical-notes"
// Re-export so existing consumers (intake-decline-dialog) don't have to change import paths.
import { DECLINE_REASONS } from "@/lib/doctor/decline-reasons"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { isConsultServiceType, isKnownDoctorServiceType, isPrescribingConsultSubtype, SERVICE_TYPES } from "@/lib/doctor/service-types"
import { formatIntakeStatus } from "@/lib/format/intake"
import type { DeclineReasonCode, IntakeStatus, IntakeWithDetails } from "@/types/db"

import { formatAutoApprovalReason } from "./intake-helpers"
import { IntakeRefundDialog } from "./intake-refund-dialog"
import type { IntakeDialogState } from "./use-intake-dialogs"

export { DECLINE_REASONS }

interface PendingCorrection {
  id: string
  requestedStartDate: string
  requestedEndDate: string
  reason: string
  patientName: string
  createdAt: string
}

interface IntakeDetailHeaderProps {
  intake: IntakeWithDetails
  isPending: boolean
  isLoadingPreview: boolean
  isViewingCert: boolean
  actionMessage: { type: "success" | "error" | "warning"; text: string } | null
  dialogs: IntakeDialogState
  showCertPreview: boolean
  setShowCertPreview: (val: boolean) => void
  certPreviewData: CertificatePreviewData | null
  certPdfUrl: string | null
  onCloseCertPdf: () => void
  pendingCorrection: PendingCorrection | null | undefined
  onMedCertApprove: () => void
  onStatusChange: (status: IntakeStatus) => void
  onDecline: () => void
  onMarkScriptSent: () => void
  onMarkRefunded: () => void
  onApproveDateCorrection: () => void
  onResendCertificate: () => void
  onViewCertificate: () => void
  onCertPreviewConfirm: (data: CertificatePreviewData) => void
  onOpenParchmentPrescribe?: () => void
  onApprovePrescribedScript?: () => void
  hasPrescriptionIntent?: boolean
  showReissueDialog: boolean
  setShowReissueDialog: (val: boolean) => void
  reissuePreviewData: CertificatePreviewData | null
  onReissueCertificate: () => void
  onReissueConfirm: (data: CertificatePreviewData, notifyPatient?: boolean) => void
  certDelivery?: CertDeliveryStatus | null
  doctorNotes: string
  backHref?: string
  backLabel?: string
  supplementaryActions?: ReactNode
  compact?: boolean
}

export function IntakeDetailHeader({
  intake,
  isPending,
  isLoadingPreview,
  isViewingCert,
  actionMessage,
  dialogs,
  showCertPreview,
  setShowCertPreview,
  certPreviewData,
  certPdfUrl,
  onCloseCertPdf,
  pendingCorrection,
  onMedCertApprove,
  onStatusChange,
  onDecline,
  onMarkScriptSent,
  onMarkRefunded,
  onApproveDateCorrection,
  onResendCertificate,
  onViewCertificate,
  onCertPreviewConfirm,
  onOpenParchmentPrescribe,
  onApprovePrescribedScript,
  hasPrescriptionIntent,
  showReissueDialog,
  setShowReissueDialog,
  reissuePreviewData,
  onReissueCertificate,
  onReissueConfirm,
  certDelivery,
  doctorNotes,
  backHref = STAFF_DASHBOARD_HREF,
  backLabel = "Back to queue",
  supplementaryActions,
  compact = false,
}: IntakeDetailHeaderProps) {
  const service = intake.service as { type?: string } | undefined
  const answers = (intake.answers?.answers ?? {}) as Record<string, unknown>
  const isPrescribingConsult = intake.category === "consult" && isPrescribingConsultSubtype(intake.subtype)
  const shouldPrescribeFromConsult = isPrescribingConsult && hasPrescriptionIntent === true
  const isActivePrescribingStatus = ["paid", "in_review", "awaiting_script"].includes(intake.status)
  const canShowCompleteConsult =
    isConsultServiceType(service?.type) &&
    (shouldPrescribeFromConsult ? isActivePrescribingStatus : intake.status === "paid")
  const isRepeatScript = service?.type === SERVICE_TYPES.REPEAT_RX || service?.type === SERVICE_TYPES.COMMON_SCRIPTS
  const canPrescribeInParchment =
    isActivePrescribingStatus &&
    hasPrescriptionIntent === true &&
    (isRepeatScript || shouldPrescribeFromConsult)
  const snapshotContext = {
    answers,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }
  const missingPrescribingIdentityFields = requiresPrescribingIdentityForCase(snapshotContext)
    ? buildPatientSnapshot(intake.patient, getPatientSnapshotOptionsForCase(snapshotContext)).missingCriticalFields
    : []
  const hasPrescribingIdentityBlocker = missingPrescribingIdentityFields.length > 0
  const prescribingIdentityTitle = hasPrescribingIdentityBlocker
    ? `Complete patient identity: ${missingPrescribingIdentityFields.join(", ")}`
    : undefined
  const prescribingActionLabel = hasPrescribingIdentityBlocker ? "Complete patient identity" : null
  const approvalNeedsClinicalNotes =
    (service?.type === SERVICE_TYPES.MED_CERTS && ["paid", "in_review"].includes(intake.status)) ||
    canShowCompleteConsult ||
    (!isKnownDoctorServiceType(service?.type) && intake.status === "paid")
  const approveDisabledReason =
    approvalNeedsClinicalNotes && !isClinicalNoteSufficient(doctorNotes)
      ? "Use the draft note or add a brief clinical note."
      : null

  // Plan 06: block Prescribe/Complete for a legacy repeat-Rx missing
  // medication/dose/indication unless a clinical note exists (then it warns).
  const packetBlocker = getPrescribingPacketBlocker(
    buildPrescribingPacket({
      serviceType: service?.type,
      subtype: intake.subtype,
      answers,
      intake: { status: intake.status, script_sent: intake.script_sent },
    }),
    doctorNotes,
  )
  // blocked-only (gates the disabled-reason). The non-blocking warning surfaces via
  // the PrescribingPacketCard + the Prescribe/Approve button title (packetBlocker.message).
  const prescribingPacketBlockMessage = packetBlocker.blocked ? packetBlocker.message : null

  const getStatusColor = (status: string) => {
    return INTAKE_STATUS[status as StatusType]?.color ?? "bg-primary/10 text-primary"
  }
  const actionButtonSize = compact ? "sm" : "default"
  const canApproveAfterPrescribe = intake.script_sent === true
  const completeConsultNeedsScript = shouldPrescribeFromConsult && !canApproveAfterPrescribe
  const approveAfterPrescribeTitle = hasPrescribingIdentityBlocker
    ? prescribingIdentityTitle
    : canApproveAfterPrescribe
      ? "Approve after the prescription has been completed in Parchment."
      : "Complete or record the prescription in Parchment first."
  const prescribingApproveHint =
    canPrescribeInParchment && !hasPrescribingIdentityBlocker && !canApproveAfterPrescribe
      ? "Complete or record the prescription in Parchment first."
      : null
  const completeConsultDisabledReason = shouldPrescribeFromConsult
    ? hasPrescribingIdentityBlocker
      ? prescribingIdentityTitle
      : prescribingPacketBlockMessage ?? (completeConsultNeedsScript
        ? "Complete or record the prescription in Parchment first."
        : approveDisabledReason)
    : prescribingPacketBlockMessage ?? approveDisabledReason

  const handlePrescribeClick = () => {
    onOpenParchmentPrescribe?.()
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-white px-3 py-2.5 shadow-sm shadow-primary/[0.04] dark:bg-card dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Badge className={getStatusColor(intake.status)}>
            {formatIntakeStatus(intake.status)}
          </Badge>
          {intake.script_sent === true ? (
            <Badge className="border-success/20 bg-success-light text-success">
              Script sent
            </Badge>
          ) : null}
          {/* Phase 3 of dashboard remaster (2026-05-12): consolidated badge */}
          <CertHealthChip certificate={certDelivery ?? null} intakeId={intake.id} />
          {/* Why auto-approval routed this to a human (B4 visibility, 2026-06-11
              review): the deterministic net writes the reason to
              auto_approval_state_reason but it rendered nowhere — the doctor had
              to re-spot "exam deferral" etc. in free text. Calm chrome: dot +
              plain text; full raw reason in the tooltip. */}
          {(intake.auto_approval_state === "needs_doctor" ||
            intake.auto_approval_state === "failed_retrying") &&
          intake.auto_approval_state_reason &&
          ["paid", "in_review"].includes(intake.status) ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              title={`Auto-approval routed this to doctor review. Reason: ${intake.auto_approval_state_reason}`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Auto-approval skipped: {formatAutoApprovalReason(intake.auto_approval_state_reason)}
            </span>
          ) : null}
          {supplementaryActions}
        </div>
      </div>

      {/* Acquisition source: calm-chrome staff-only signal so the operator
          can see at a glance where this request came from (Google Ads,
          organic, AI referral, direct). Driven by intake attribution
          columns and the shared `classifyAttributionSource` classifier. */}
      <AttributionChip
        variant="inline"
        className="px-1"
        attribution={{
          adgroupid: intake.adgroupid,
          campaignid: intake.campaignid,
          creative: intake.creative,
          device: intake.device,
          gbraid: intake.gbraid,
          gclid: intake.gclid,
          keyword: intake.keyword,
          landing_page: intake.landing_page,
          matchtype: intake.matchtype,
          network: intake.network,
          referrer: intake.referrer,
          utm_campaign: intake.utm_campaign,
          utm_medium: intake.utm_medium,
          utm_source: intake.utm_source,
          utm_term: intake.utm_term,
          wbraid: intake.wbraid,
        }}
      />

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            actionMessage.type === "success"
              ? "bg-success-light text-success"
              : actionMessage.type === "warning"
              ? "bg-warning-light border border-warning-border text-warning"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Pending Date Correction Request from Patient */}
      {pendingCorrection && (
        <Card className="border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
          <CardContent className="px-4 py-3 space-y-3">
            <p className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Date Correction Requested
            </p>
            <div className="text-sm space-y-1 text-blue-800 dark:text-blue-300">
              <p>Patient requested dates: <strong>{pendingCorrection.requestedStartDate}</strong> to <strong>{pendingCorrection.requestedEndDate}</strong></p>
              <p>Reason: {pendingCorrection.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onApproveDateCorrection} disabled={isPending}>
                {isPending ? "Approving..." : "Approve & Update Dates"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={buildDoctorDocumentBuilderHref(intake.id)}>
                  Edit & Resend
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Auto-Approved Info */}
      {intake.ai_approved && (
        <Card className="border-teal-200/50 dark:border-teal-500/20 bg-teal-50/50 dark:bg-teal-500/5">
          <CardContent className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-teal-100 dark:bg-teal-500/20 p-1.5 shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  AI Auto-Approved
                  {intake.ai_approved_at && (
                    <span className="font-normal text-teal-500 dark:text-teal-400 ml-2 text-xs">
                      {new Date(intake.ai_approved_at).toLocaleString("en-AU", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  )}
                </p>
                {intake.ai_approval_reason && (
                  <p className="text-xs text-teal-600/80 dark:text-teal-400/80">
                    {intake.ai_approval_reason}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="shrink-0" data-testid="operator-action-rail">
        <CardContent className={compact ? "px-3 py-3" : "px-4 py-4"}>
          <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-3"}>
            {hasPrescribingIdentityBlocker && (
              <div className="w-full rounded-md border border-warning-border bg-warning-light px-3 py-2 text-sm font-medium text-warning">
                Complete patient identity before prescribing: {missingPrescribingIdentityFields.join(", ")}
              </div>
            )}

            {/* For med certs - preview then approve: shows preview dialog first */}
            {service?.type === SERVICE_TYPES.MED_CERTS && ["paid", "in_review"].includes(intake.status) && (
              <Button
                size={actionButtonSize}
                onClick={onMedCertApprove}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isPending || isLoadingPreview || Boolean(approveDisabledReason)}
                title={approveDisabledReason || undefined}
              >
                {(isPending || isLoadingPreview) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isLoadingPreview ? "Loading Preview..." : isPending ? "Generating Certificate..." : "Approve & Send Certificate"}
              </Button>
            )}

            {canPrescribeInParchment && (
              <>
                {onOpenParchmentPrescribe && (
                  <Button
                    size={actionButtonSize}
                    onClick={handlePrescribeClick}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isPending || hasPrescribingIdentityBlocker || packetBlocker.blocked}
                    title={packetBlocker.message ?? prescribingIdentityTitle}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {prescribingActionLabel ?? "Prescribe"}
                  </Button>
                )}
                {onApprovePrescribedScript && (
                  !shouldPrescribeFromConsult ? (
                    <Button
                      size={actionButtonSize}
                      onClick={onApprovePrescribedScript}
                      className="bg-primary hover:bg-primary/90"
                      disabled={isPending || hasPrescribingIdentityBlocker || !canApproveAfterPrescribe || packetBlocker.blocked}
                      title={packetBlocker.message ?? approveAfterPrescribeTitle}
                      aria-describedby={prescribingApproveHint ? "full-case-prescribing-approve-hint" : undefined}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      {isPending ? "Approving..." : "Approve"}
                    </Button>
                  ) : null
                )}
                {intake.script_sent === true ? null : (
                  <Button
                    size={actionButtonSize}
                    variant="outline"
                    onClick={dialogs.openScriptDialog}
                  >
                    Sent outside Parchment
                  </Button>
                )}
              </>
            )}

            {/* For consults - approve after call with notes */}
            {canShowCompleteConsult && (
              <Button
                size={actionButtonSize}
                onClick={shouldPrescribeFromConsult && onApprovePrescribedScript
                  ? onApprovePrescribedScript
                  : () => onStatusChange("approved")}
                className="bg-primary hover:bg-primary/90"
                disabled={isPending || Boolean(completeConsultDisabledReason)}
                title={completeConsultDisabledReason || undefined}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Completing..." : "Complete Consultation"}
              </Button>
            )}

            {/* Generic approve for other services */}
            {!isKnownDoctorServiceType(service?.type) && intake.status === "paid" && (
              <Button
                size={actionButtonSize}
                onClick={() => onStatusChange("approved")}
                className="bg-primary hover:bg-primary/90"
                disabled={isPending || Boolean(approveDisabledReason)}
                title={approveDisabledReason || undefined}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Approving..." : "Approve"}
              </Button>
            )}

            {/* Decline */}
            {!["approved", "declined", "completed"].includes(intake.status) && (
              <Button size={actionButtonSize} variant="destructive" onClick={dialogs.openDeclineDialog} disabled={isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}

            {/* Refund - show for paid intakes (full refund) AND partially_refunded
                intakes (top-up to full). Once fully refunded, the button hides. */}
            {(intake.payment_status === "paid" || intake.payment_status === "partially_refunded") && (
              <Button size={actionButtonSize} variant="outline" onClick={dialogs.openRefundDialog} disabled={isPending} className="text-warning border-warning-border hover:bg-warning-light">
                <CreditCard className="h-4 w-4 mr-2" />
                {intake.payment_status === "partially_refunded" ? "Top up refund" : "Issue refund"}
              </Button>
            )}

            {/* Certificate actions - show for approved med certs */}
            {["approved", "completed"].includes(intake.status) &&
             (intake.category === "medical_certificate" || intake.category === "med_certs") && (
              <>
                <Button size={actionButtonSize} variant="outline" onClick={onViewCertificate} disabled={isPending || isViewingCert}>
                  {isViewingCert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  View Certificate
                </Button>
                <Button size={actionButtonSize} variant="outline" onClick={onReissueCertificate} disabled={isPending || isLoadingPreview}>
                  {isLoadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Correct certificate
                </Button>
                <Button size={actionButtonSize} variant="outline" onClick={onResendCertificate} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Resend email
                </Button>
              </>
            )}
          </div>
          {approveDisabledReason && (
            <p className="mt-3 text-xs font-medium text-warning">{approveDisabledReason}</p>
          )}
          {prescribingApproveHint && (
            <p id="full-case-prescribing-approve-hint" className="mt-3 text-xs font-medium text-muted-foreground">
              {prescribingApproveHint}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <AlertDialog open={dialogs.showDeclineDialog} onOpenChange={(open) => { if (!open) dialogs.closeDeclineDialog() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason and provide details for declining this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={dialogs.declineReasonCode} onValueChange={(v) => dialogs.onDeclineReasonCodeChange(v as DeclineReasonCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Provide additional details..."
                value={dialogs.declineReason}
                onChange={(e) => dialogs.setDeclineReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                onDecline()
              }}
              disabled={!dialogs.declineReason.trim() || isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Script Sent Dialog */}
      <AlertDialog open={dialogs.showScriptDialog} onOpenChange={(open) => { if (!open) dialogs.closeScriptDialog() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record script sent</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the prescription was sent outside the embedded Parchment flow. This records script completion; the patient is notified only after you press Approve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parchment or external reference</Label>
              <Input
                placeholder="e.g., PAR-12345"
                value={dialogs.parchmentReference}
                onChange={(e) => dialogs.setParchmentReference(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for manual script evidence.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onMarkScriptSent} disabled={isPending || !dialogs.parchmentReference.trim()} className="bg-blue-600">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog - typed-confirm with concrete amount preview. */}
      <IntakeRefundDialog
        open={dialogs.showRefundDialog}
        onOpenChange={(open) => { if (!open) dialogs.closeRefundDialog() }}
        onConfirmRefund={onMarkRefunded}
        isPending={isPending}
        paidAmountCents={intake.amount_cents ?? 0}
        alreadyRefundedCents={intake.refund_amount_cents ?? 0}
        patientName={intake.patient?.full_name?.trim() || "the patient"}
      />

      {/* Certificate Preview Dialog */}
      {certPreviewData && (
        <CertificatePreviewDialog
          open={showCertPreview}
          onOpenChange={setShowCertPreview}
          data={certPreviewData}
          onConfirm={onCertPreviewConfirm}
          isPending={isPending}
        />
      )}

      {/* Reissue Certificate Dialog */}
      {reissuePreviewData && (
        <CertificatePreviewDialog
          open={showReissueDialog}
          onOpenChange={setShowReissueDialog}
          data={reissuePreviewData}
          onConfirm={onReissueConfirm}
          isPending={isPending}
          mode="reissue"
        />
      )}

      {/* Certificate PDF Viewer - shared component */}
      <PdfViewerDialog
        open={!!certPdfUrl}
        onOpenChange={(open) => { if (!open) onCloseCertPdf() }}
        pdfUrl={certPdfUrl}
        title="Issued Certificate"
        description="The actual PDF that was delivered to the patient."
      />
    </>
  )
}
