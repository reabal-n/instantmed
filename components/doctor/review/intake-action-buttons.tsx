"use client"

import { ArrowUpRight, CheckCircle, ClipboardCheck, Loader2, Send } from "lucide-react"
import Link from "next/link"
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
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import { isClinicalNoteSufficient } from "@/lib/doctor/clinical-notes"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { isConsultServiceType, isKnownDoctorServiceType } from "@/lib/doctor/service-types"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

function ShortcutHint({
  children,
  tone = "neutral",
}: {
  children: string
  tone?: "neutral" | "on-primary"
}) {
  return (
    <span
      data-shortcut-hint
      className={cn(
        "ml-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none",
        tone === "on-primary"
          ? "bg-white/15 text-white/85"
          : "bg-muted/55 text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

function ActionReadinessChecks({
  detailsReady,
  noteReady,
  safetyReady,
  readyLabel = "Case ready to send.",
}: {
  detailsReady: boolean
  noteReady: boolean
  safetyReady: boolean
  readyLabel?: string
}) {
  const checks = [
    { label: "Intake checked", ready: detailsReady, completeLabel: "Intake checked", incompleteLabel: "Check intake" },
    { label: "Safety checked", ready: safetyReady, completeLabel: "Safety checked", incompleteLabel: "Review safety" },
    { label: "Note ready", ready: noteReady, completeLabel: "Draft note ready", incompleteLabel: "Add note" },
  ]
  const readyCount = checks.filter((check) => check.ready).length
  const incompleteChecks = checks.filter((check) => !check.ready)

  return (
    <div
      className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-muted-foreground sm:mr-auto"
      data-action-readiness
      aria-label="Approval readiness checks"
    >
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground">
        <CheckCircle className={cn("h-3.5 w-3.5", readyCount === checks.length ? "text-slate-600" : "text-warning")} aria-hidden />
        {readyCount === checks.length ? `All checks passed. ${readyLabel}` : `Needs attention · ${readyCount}/${checks.length}`}
      </span>
      {incompleteChecks.map((check) => (
        <span
          key={check.label}
          title={check.incompleteLabel}
          className="inline-flex cursor-default select-none items-center gap-1 font-semibold text-warning"
          aria-label={`${check.incompleteLabel}: needs attention`}
        >
          <span
            className="grid h-3.5 w-3.5 place-items-center rounded-full border border-warning/55 bg-background"
            aria-hidden
          />
          <span>{check.incompleteLabel}</span>
        </span>
      ))}
    </div>
  )
}

export function IntakeActionButtons({
  placement = "bottom",
  requiresClinicalDetail = false,
  onRequestClinicalDetail,
  isRequestingClinicalDetail = false,
}: {
  placement?: "top" | "bottom"
  requiresClinicalDetail?: boolean
  onRequestClinicalDetail?: () => void
  isRequestingClinicalDetail?: boolean
}) {
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
        patientDateOfBirth: intake.patient.date_of_birth ?? null,
        patientSex: intake.patient.sex ?? null,
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      answers,
      intake.category,
      intake.patient.full_name,
      intake.patient.date_of_birth,
      intake.patient.sex,
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
  const needsClinicalNotes = !isClinicalNoteSufficient(doctorNotes)
  const approvalNeedsClinicalNotes =
    (service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status)) ||
    (isConsultServiceType(service?.type) && intake.status === "paid" && !shouldPrescribeFromConsult) ||
    (!isKnownDoctorServiceType(service?.type) && intake.status === "paid")
  const approveDisabledReason = approvalNeedsClinicalNotes && needsClinicalNotes
    ? "Use the draft note or add a brief clinical note."
    : null
  const snapshotContext = {
    answers,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }
  const patientSnapshot = buildPatientSnapshot(intake.patient, getPatientSnapshotOptionsForCase(snapshotContext))
  const missingPrescribingIdentityFields = requiresPrescribingIdentityForCase(snapshotContext)
    ? patientSnapshot.missingCriticalFields
    : []
  const hasPatientDetailsReady = patientSnapshot.missingCriticalFields.length === 0
  const hasPrescribingIdentityBlocker = missingPrescribingIdentityFields.length > 0
  const prescribingIdentityTitle = hasPrescribingIdentityBlocker
    ? `Complete patient identity: ${missingPrescribingIdentityFields.join(", ")}`
    : undefined
  const prescribingActionLabel = hasPrescribingIdentityBlocker ? "Complete patient identity" : null
  const canDecline = !["approved", "declined", "completed"].includes(intake.status)
  const showRefundOnDecline = canDecline && intake.payment_status === "paid"
  const refundRemainingCents = Math.max(0, (intake.amount_cents ?? 0) - (intake.refund_amount_cents ?? 0))
  const refundLabel = refundRemainingCents > 0 ? formatCurrency(refundRemainingCents) : null
  const refundShortLabel = refundLabel?.replace(/\.00$/, "")
  const requestClinicalDetailLabel = "Request symptoms"
  const disabledApproveHint = requiresClinicalDetail
    ? "Symptoms missing; the next screen asks you to confirm before sending."
    : approveDisabledReason
  const showActionReadiness = ["paid", "in_review", "awaiting_script"].includes(intake.status)
  const readyLabel = service?.type === "med_certs" ? "Certificate ready to send." : "Case ready to send."
  const safetyReady =
    caseSummary.safetyItems.length === 0 &&
    intake.requires_live_consult !== true &&
    intake.risk_tier !== "high"

  return (
    <div
      className={
        placement === "top"
          ? "rounded-xl border border-border/60 bg-background p-2 shadow-sm shadow-primary/[0.03]"
          : "sticky bottom-0 z-30 shrink-0 border-t border-border bg-gradient-to-t from-background via-background/95 to-background/85 px-2 py-1.5 shadow-lg shadow-primary/[0.08] backdrop-blur supports-[backdrop-filter]:from-background/95 supports-[backdrop-filter]:via-background/90"
      }
      data-testid="operator-action-rail"
      data-action-rail-pinned
      data-action-rail-outside-scroll
    >
      {hasPrescribingIdentityBlocker && (
        <div className="mb-2 flex flex-col gap-2 rounded-md border border-warning-border bg-warning-light px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-warning">
              Patient identity incomplete
            </p>
            <p className="text-xs text-warning/90">
              Missing for prescribing: {missingPrescribingIdentityFields.join(", ")}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 border-warning-border bg-background text-warning hover:bg-background/80"
          >
            <Link
              href={buildStaffPatientHref(intake.patient.id)}
              prefetch={false}
            >
              Open patient profile
              <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
      {showRefundOnDecline ? (
        <p className="mb-1.5 text-[11px] font-medium leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Full refund if we can't help.</span>{" "}
          {refundShortLabel ? `Declining this case refunds ${refundShortLabel} to the patient automatically.` : "Declining this case refunds the patient automatically."}
        </p>
      ) : null}
      <div
        className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>button]:w-full [&>div]:w-full sm:[&>button]:w-auto sm:[&>div]:w-auto"
        data-action-bar
      >
        {showActionReadiness ? (
          <ActionReadinessChecks
            detailsReady={hasPatientDetailsReady}
            noteReady={!needsClinicalNotes}
            safetyReady={safetyReady}
            readyLabel={readyLabel}
          />
        ) : null}

        {/* Med cert: approve opens the confirm-before-sending preview flow. */}
        {service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status) && (
          <>
            <Button
              onClick={handleMedCertApprove}
              className="h-7 bg-[#2563EB] px-2.5 text-xs text-white transition-colors hover:bg-[#1D4ED8]"
              disabled={isPending || isLoadingPreview || Boolean(approveDisabledReason)}
              title={approveDisabledReason || undefined}
              size="sm"
            >
              {isPending || isLoadingPreview ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1.5" />
              )}
              {isLoadingPreview ? "Loading..." : isPending ? "Generating..." : requiresClinicalDetail ? "Review and send" : "Approve and send"}
              <ShortcutHint tone="on-primary">Cmd+Enter</ShortcutHint>
            </Button>
            {requiresClinicalDetail ? (
              <Button
                onClick={onRequestClinicalDetail}
                variant="outline"
                className="h-7 border-border/70 bg-background px-2.5 text-xs text-foreground hover:bg-muted/40"
                disabled={isPending || isRequestingClinicalDetail || !onRequestClinicalDetail}
                title="Ask the patient to describe symptoms before issuing a certificate."
                size="sm"
              >
                {isRequestingClinicalDetail ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                {isRequestingClinicalDetail ? "Sending..." : requestClinicalDetailLabel}
              </Button>
            ) : null}
          </>
        )}

      {/* Repeat scripts: approve and open Parchment when the request is clinically prescribable */}
      {isRepeatScript && intake.status === "paid" && hasPrescriptionIntent && (
        <Button
          onClick={handleApproveAndOpenParchment}
          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
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
          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
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
          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
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
            className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700"
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
          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
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
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
              disabled={isPending || Boolean(approveDisabledReason)}
              title={approveDisabledReason || undefined}
              size="sm"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
            {isPending ? "Approving..." : "Approve"}
          </Button>
        )}

      {/* Decline */}
      {canDecline && (
        <div
          className="flex w-full flex-col gap-1 border-t border-border/60 pt-2 sm:order-first sm:mr-auto sm:w-auto sm:items-start sm:border-t-0 sm:pr-3 sm:pt-0"
          data-decline-lane
          data-decline-action
        >
          <Button
            variant="outline"
            onClick={() => setShowDeclineDialog(true)}
            className="h-7 border-rose-200/70 bg-background px-2.5 text-[11px] font-semibold text-rose-700 shadow-none transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 dark:border-rose-900/55 dark:bg-card dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
            disabled={isPending}
            size="sm"
            title={showRefundOnDecline ? "Confirming decline refunds the patient." : undefined}
          >
            {showRefundOnDecline ? "Decline & refund" : "Decline request"}
            <ShortcutHint>Cmd+Shift+D</ShortcutHint>
          </Button>
        </div>
      )}
      </div>
      {disabledApproveHint && (
        <p className="mt-2 inline-flex w-fit items-center rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-xs font-medium text-slate-600 dark:text-muted-foreground">
          {disabledApproveHint}
        </p>
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
