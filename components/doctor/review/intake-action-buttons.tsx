"use client"

import { CheckCircle, ClipboardCheck, Loader2, Send, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { markScriptSentAction } from "@/app/doctor/queue/actions"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { MIN_CLINICAL_NOTES_LENGTH } from "@/lib/doctor/clinical-notes"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { isConsultServiceType, isKnownDoctorServiceType } from "@/lib/doctor/service-types"

export function IntakeActionButtons() {
  const {
    intake,
    service,
    answers,
    doctorNotes,
    isPending,
    isLoadingPreview,
    handleMedCertApprove,
    handleStatusChange,
    handleOpenParchmentPrescribe,
    handleApproveAndOpenParchment,
    setShowDeclineDialog,
  } = useIntakeReview()

  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        answers,
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient.full_name,
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      answers,
      intake.category,
      intake.patient.full_name,
      intake.requires_live_consult,
      intake.risk_tier,
      intake.subtype,
      service?.type,
    ],
  )

  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)
  const isRepeatScript = service?.type === "repeat_rx" || service?.type === "common_scripts"
  const isPrescribingConsult = intake.category === "consult" && ["ed", "hair_loss"].includes(intake.subtype || "")
  const shouldPrescribeFromConsult = isPrescribingConsult && hasPrescriptionIntent
  const needsClinicalNotes = doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH
  const approvalNeedsClinicalNotes =
    (service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status)) ||
    (isConsultServiceType(service?.type) && intake.status === "paid" && !shouldPrescribeFromConsult) ||
    (!isKnownDoctorServiceType(service?.type) && intake.status === "paid")
  const approveDisabledReason = approvalNeedsClinicalNotes && needsClinicalNotes
    ? `Add clinical notes (${doctorNotes.trim().length}/${MIN_CLINICAL_NOTES_LENGTH} chars) before approving.`
    : null
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

  return (
    <div className="sticky bottom-0 bg-background border-t border-border pt-3 pb-1" data-testid="operator-action-rail">
      {hasPrescribingIdentityBlocker && (
        <div className="w-full rounded-md border border-warning-border bg-warning-light px-3 py-2 text-xs font-medium text-warning">
          Complete patient identity before prescribing: {missingPrescribingIdentityFields.join(", ")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {/* Med cert: preview then approve */}
        {service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status) && (
        <Button
          onClick={handleMedCertApprove}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={isPending || isLoadingPreview || Boolean(approveDisabledReason)}
          title={approveDisabledReason || undefined}
          size="sm"
        >
          {isPending || isLoadingPreview ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1.5" />
          )}
          {isLoadingPreview ? "Loading..." : isPending ? "Generating..." : "Approve & Send Certificate"}
        </Button>
      )}

      {/* Repeat scripts: approve and open Parchment when the request is clinically prescribable */}
      {isRepeatScript && intake.status === "paid" && hasPrescriptionIntent && (
        <Button
          onClick={handleApproveAndOpenParchment}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending || hasPrescribingIdentityBlocker}
          title={prescribingIdentityTitle}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : prescribingActionLabel ?? "Approve + Prescribe"}
        </Button>
      )}

      {isRepeatScript && intake.status === "paid" && !hasPrescriptionIntent && (
        <Button
          onClick={() => handleStatusChange("awaiting_script")}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending || hasPrescribingIdentityBlocker}
          title={prescribingIdentityTitle}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : prescribingActionLabel ?? "Approve Script"}
        </Button>
      )}

      {shouldPrescribeFromConsult && ["paid", "in_review"].includes(intake.status) && (
        <Button
          onClick={handleApproveAndOpenParchment}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending || hasPrescribingIdentityBlocker}
          title={prescribingIdentityTitle}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : prescribingActionLabel ?? "Approve + Prescribe"}
        </Button>
      )}

      {hasPrescriptionIntent && intake.status === "awaiting_script" && (
        <>
          <Button
            onClick={handleOpenParchmentPrescribe}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isPending || hasPrescribingIdentityBlocker}
            title={prescribingIdentityTitle}
            size="sm"
          >
            <Send className="h-4 w-4 mr-1.5" />
            {prescribingActionLabel ?? "Open Parchment"}
          </Button>
          {/*
            Mark Sent Manually fallback (added 2026-05-12).
            Used when prescribing happened outside InstantMed (e.g. real
            Parchment when only the sandbox is wired, or any other
            external prescribing path). Without this the slide-over
            traps the operator on the Parchment iframe — the
            full-page case header has the same button but the slide-over
            was missing it.
          */}
          <MarkSentManuallyButton intakeId={intake.id} />
        </>
      )}

      {/* Consults: complete */}
      {isConsultServiceType(service?.type) && intake.status === "paid" && !shouldPrescribeFromConsult && (
        <Button
          onClick={() => handleStatusChange("approved")}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending || Boolean(approveDisabledReason)}
          title={approveDisabledReason || undefined}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
          {isPending ? "Completing..." : "Complete Consultation"}
        </Button>
      )}

      {/* Generic approve */}
      {!isKnownDoctorServiceType(service?.type) &&
        intake.status === "paid" && (
          <Button
            onClick={() => handleStatusChange("approved")}
            className="bg-primary hover:bg-primary/90"
            disabled={isPending || Boolean(approveDisabledReason)}
            title={approveDisabledReason || undefined}
            size="sm"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
            {isPending ? "Approving..." : "Approve"}
          </Button>
        )}

      {/* Decline */}
      {!["approved", "declined", "completed"].includes(intake.status) && (
        <Button
          variant="destructive"
          onClick={() => setShowDeclineDialog(true)}
          disabled={isPending}
          size="sm"
        >
          <XCircle className="h-4 w-4 mr-1.5" />
          Decline
        </Button>
      )}
      </div>
      {approveDisabledReason && (
        <p className="mt-2 text-xs font-medium text-warning">{approveDisabledReason}</p>
      )}
    </div>
  )
}

/**
 * Self-contained "Mark Sent Manually" button + confirmation dialog for the
 * intake-review slide-over. Added 2026-05-12 to mirror the full-page case
 * header's fallback path. Without it, an operator stuck on a broken
 * Parchment iframe (sandbox connected, real prescribing done externally)
 * cannot clear the request from the queue or trigger the patient email.
 *
 * Kept local to this file so the slide-over's existing action-rail
 * `useTransition` is not disturbed. On success, `router.refresh()` reloads
 * the page state and the slide-over re-fetches the intake (now in
 * `script_sent` status) so the operator can close it / advance.
 */
function MarkSentManuallyButton({ intakeId }: { intakeId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [parchmentReference, setParchmentReference] = useState("")
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    setParchmentReference("")
    setReason("")
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const reasonNote = reason.trim()
      const result = await markScriptSentAction(
        intakeId,
        reasonNote ? `Sent outside Parchment: ${reasonNote}` : undefined,
        parchmentReference.trim() || undefined,
      )
      if (result.success) {
        toast.success("Script marked as sent. Patient email queued.")
        setOpen(false)
        reset()
        router.refresh()
      } else {
        toast.error(result.error || "Failed to mark script sent")
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        <ClipboardCheck className="h-4 w-4 mr-1.5" />
        Sent outside Parchment
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isPending) return
          if (!next) reset()
          setOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm sent outside Parchment</AlertDialogTitle>
            <AlertDialogDescription>
              Use this when you've sent the script through a different channel
              (paper script, alternate pharmacy portal, fax) and the Parchment
              webhook will not fire. The case leaves the queue and the patient
              is emailed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mark-sent-parchment-reference">
                Parchment reference (if applicable)
              </Label>
              <Input
                id="mark-sent-parchment-reference"
                placeholder="e.g., PAR-12345"
                value={parchmentReference}
                onChange={(event) => setParchmentReference(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mark-sent-reason">
                Channel used (recorded in the audit log)
              </Label>
              <Input
                id="mark-sent-reason"
                placeholder="e.g., Paper script handed to patient"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
