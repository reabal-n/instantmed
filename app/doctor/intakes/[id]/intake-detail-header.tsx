"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  FileText,
  Save,
  Loader2,
  Send,
  Mail,
} from "lucide-react"
import { INTAKE_STATUS, type IntakeStatus as StatusType } from "@/lib/status"
import { CertificatePreviewDialog, type CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { PdfViewerDialog } from "@/components/doctor/pdf-viewer-dialog"
import { formatIntakeStatus } from "@/lib/format-intake"
import type { IntakeWithDetails, IntakeStatus, DeclineReasonCode } from "@/types/db"

// P0 DOCTOR_WORKLOAD_AUDIT: Pre-filled decline reason templates to equalize approve/decline effort
export const DECLINE_REASONS: { code: DeclineReasonCode; label: string; template: string }[] = [
  {
    code: "requires_examination",
    label: "Requires in-person examination",
    template: "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular doctor or visit a clinic for an in-person assessment."
  },
  {
    code: "not_telehealth_suitable",
    label: "Not suitable for telehealth",
    template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular doctor."
  },
  {
    code: "prescribing_guidelines",
    label: "Against prescribing guidelines",
    template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history."
  },
  {
    code: "controlled_substance",
    label: "Controlled substance request",
    template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person."
  },
  {
    code: "urgent_care_needed",
    label: "Requires urgent care",
    template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency."
  },
  {
    code: "insufficient_info",
    label: "Insufficient information",
    template: "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular doctor."
  },
  {
    code: "patient_not_eligible",
    label: "Patient not eligible",
    template: "Based on the eligibility criteria, we are unable to process this request. Please see your regular doctor for assistance."
  },
  {
    code: "outside_scope",
    label: "Outside scope of practice",
    template: "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular doctor or an appropriate specialist."
  },
  {
    code: "other",
    label: "Other reason",
    template: ""
  },
]

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
  actionMessage: { type: "success" | "error"; text: string } | null
  showDeclineDialog: boolean
  setShowDeclineDialog: (val: boolean) => void
  showScriptDialog: boolean
  setShowScriptDialog: (val: boolean) => void
  showRefundDialog: boolean
  setShowRefundDialog: (val: boolean) => void
  declineReason: string
  setDeclineReason: (val: string) => void
  declineReasonCode: DeclineReasonCode
  onDeclineReasonCodeChange: (code: DeclineReasonCode) => void
  parchmentReference: string
  setParchmentReference: (val: string) => void
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
}

export function IntakeDetailHeader({
  intake,
  isPending,
  isLoadingPreview,
  isViewingCert,
  actionMessage,
  showDeclineDialog,
  setShowDeclineDialog,
  showScriptDialog,
  setShowScriptDialog,
  showRefundDialog,
  setShowRefundDialog,
  declineReason,
  setDeclineReason,
  declineReasonCode,
  onDeclineReasonCodeChange,
  parchmentReference,
  setParchmentReference,
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
}: IntakeDetailHeaderProps) {
  const service = intake.service as { type?: string } | undefined

  const getStatusColor = (status: string) => {
    return INTAKE_STATUS[status as StatusType]?.color ?? "bg-primary/10 text-primary"
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/doctor/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Link>
        </Button>
        <Badge className={getStatusColor(intake.status)}>
          {formatIntakeStatus(intake.status)}
        </Badge>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            actionMessage.type === "success" ? "bg-success-light text-success" : "bg-destructive/10 text-destructive"
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
            <div className="flex gap-2">
              <Button size="sm" onClick={onApproveDateCorrection} disabled={isPending}>
                {isPending ? "Approving..." : "Approve & Update Dates"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/doctor/intakes/${intake.id}/document`}>
                  Edit & Resend
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="px-4 py-4">
          <div className="flex flex-wrap gap-3">
            {/* For med certs - preview then approve: shows preview dialog first */}
            {service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status) && (
              <Button onClick={onMedCertApprove} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending || isLoadingPreview}>
                {(isPending || isLoadingPreview) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isLoadingPreview ? "Loading Preview..." : isPending ? "Generating Certificate..." : "Approve & Send Certificate"}
              </Button>
            )}

            {/* For repeat scripts - approve then mark sent externally */}
            {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
              <Button onClick={() => onStatusChange("awaiting_script")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Approving..." : "Approve Script"}
              </Button>
            )}

            {/* Mark script as sent (for awaiting_script status) */}
            {intake.status === "awaiting_script" && (
              <Button onClick={() => setShowScriptDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4 mr-2" />
                Mark Script Sent
              </Button>
            )}

            {/* For consults - approve after call with notes */}
            {service?.type === "consults" && intake.status === "paid" && (
              <Button onClick={() => onStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Completing..." : "Complete Consultation"}
              </Button>
            )}

            {/* Generic approve for other services */}
            {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") && intake.status === "paid" && (
              <Button onClick={() => onStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Approving..." : "Approve"}
              </Button>
            )}

            {/* Decline */}
            {!["approved", "declined", "completed"].includes(intake.status) && (
              <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} disabled={isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}

            {/* Refund - show for paid intakes that haven't been refunded */}
            {intake.payment_status === "paid" && (
              <Button variant="outline" onClick={() => setShowRefundDialog(true)} disabled={isPending} className="text-warning border-warning-border hover:bg-warning-light">
                <CreditCard className="h-4 w-4 mr-2" />
                Issue Refund
              </Button>
            )}

            {/* Certificate actions - show for approved med certs */}
            {["approved", "completed"].includes(intake.status) &&
             (intake.category === "medical_certificate" || intake.category === "med_certs") && (
              <>
                <Button variant="outline" onClick={onViewCertificate} disabled={isPending || isViewingCert}>
                  {isViewingCert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  View Certificate
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/doctor/intakes/${intake.id}/document`}>
                    <Save className="h-4 w-4 mr-2" />
                    Edit & Resend
                  </Link>
                </Button>
                <Button variant="outline" onClick={onResendCertificate} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Resend Email
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
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
              <Select value={declineReasonCode} onValueChange={(v) => onDeclineReasonCodeChange(v as DeclineReasonCode)}>
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
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
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
              disabled={!declineReason.trim() || isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Script Sent Dialog */}
      <AlertDialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Script as Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have sent the prescription via Parchment or other means.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parchment Reference (optional)</Label>
              <Input
                placeholder="e.g., PAR-12345"
                value={parchmentReference}
                onChange={(e) => setParchmentReference(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onMarkScriptSent} disabled={isPending} className="bg-blue-600">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Refund</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically process a full refund via Stripe and notify the patient by email. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onMarkRefunded} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Certificate PDF Viewer — shared component */}
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
