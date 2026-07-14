"use client"

import { ArrowUpRight, CheckCircle, ClipboardCheck, Clock, Loader2, Send, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { markScriptSentAction } from "@/app/doctor/queue/actions"
import {
  type ReloadReviewData,
  useIntakeReview,
} from "@/components/doctor/review/intake-review-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import {
  getRepeatRxAttestationStatus,
  hasLegacyRepeatRxReconciliationNote,
} from "@/lib/clinical/repeat-rx-attestation"
import { buildReviewPacket, getReviewPacketBlocker } from "@/lib/clinical/review-packet"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import { isClinicalNoteSufficient } from "@/lib/doctor/clinical-notes"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { QUEUE_WAIT_TARGET_MINUTES } from "@/lib/doctor/queue-pressure"
import { calculateLiveWaitTime, getQueueClockTickDelayMs, getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { isConsultServiceType, isKnownDoctorServiceType, isPrescribingConsultSubtype } from "@/lib/doctor/service-types"
import { formatCurrency } from "@/lib/format"
import { formatMinutes } from "@/lib/format/dates"
import { cn } from "@/lib/utils"

const DECISION_WAIT_SIGNAL_CADENCE_MS = 60_000
const MANUAL_SCRIPT_PANEL_STORAGE_KEY = "instantmed:manual-script-panel-intake-id"

function getStoredManualScriptPanelIntakeId() {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistManualScriptPanelIntakeId(intakeId: string) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY, intakeId)
  } catch {
    // Non-critical UI restoration only.
  }
}

function clearManualScriptPanelIntakeId(intakeId: string) {
  if (typeof window === "undefined") return
  try {
    if (window.sessionStorage.getItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY) === intakeId) {
      window.sessionStorage.removeItem(MANUAL_SCRIPT_PANEL_STORAGE_KEY)
    }
  } catch {
    // Non-critical UI restoration only.
  }
}

function ShortcutHint({
  children,
  tone = "neutral",
}: {
  children: string
  tone?: "neutral" | "on-primary" | "tertiary"
}) {
  return (
    <span
      data-shortcut-hint
      className={cn(
        "ml-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none",
        tone === "on-primary"
          ? "bg-white/15 text-white/85"
          : tone === "tertiary"
            ? "bg-transparent px-0 text-muted-foreground/65"
          : "bg-muted/55 text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

function getDecisionWaitTone(waitMinutes: number): "neutral" | "watch" | "urgent" {
  const ratio = waitMinutes / QUEUE_WAIT_TARGET_MINUTES
  if (ratio >= 0.9) return "urgent"
  if (ratio >= 0.6) return "watch"
  return "neutral"
}

function DecisionWaitSignal({ queueEnteredAt }: { queueEnteredAt: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout: number | undefined
    let cancelled = false

    const schedule = () => {
      const currentNow = new Date()
      setNow(currentNow)
      const delay = getQueueClockTickDelayMs([queueEnteredAt], currentNow, {
        postMinuteCadenceMs: DECISION_WAIT_SIGNAL_CADENCE_MS,
      }) ?? DECISION_WAIT_SIGNAL_CADENCE_MS

      timeout = window.setTimeout(() => {
        if (cancelled) return
        schedule()
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
      if (timeout) window.clearTimeout(timeout)
    }
  }, [queueEnteredAt])

  const enteredAtMs = new Date(queueEnteredAt).getTime()
  if (!Number.isFinite(enteredAtMs)) return null

  const waitMinutes = Math.max(0, Math.floor((now.getTime() - enteredAtMs) / 60000))
  const tone = getDecisionWaitTone(waitMinutes)
  if (tone === "neutral") return null

  const targetLabel = waitMinutes >= QUEUE_WAIT_TARGET_MINUTES
    ? `${formatMinutes(waitMinutes - QUEUE_WAIT_TARGET_MINUTES)} past target`
    : `${formatMinutes(QUEUE_WAIT_TARGET_MINUTES - waitMinutes)} to target`
  const waitLabel = calculateLiveWaitTime(queueEnteredAt, now, {
    afterFirstMinuteSecondsCadence: DECISION_WAIT_SIGNAL_CADENCE_MS / 1000,
  })

  return (
    <span
      className={cn(
        "inline-flex min-w-fit items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold tabular-nums",
        tone === "urgent"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : tone === "watch"
            ? "border-warning-border bg-warning-light text-warning"
            : "border-border/60 bg-muted/35 text-muted-foreground",
      )}
      title={`Case has been waiting ${waitLabel}. ${targetLabel}.`}
      data-decision-wait-signal
      data-decision-wait-tone={tone}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Waiting {waitLabel}</span>
      <span className="text-muted-foreground/70" aria-hidden="true">·</span>
      <span>{targetLabel}</span>
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
    { label: "Safety checked", ready: safetyReady, completeLabel: "No flags detected in screener", incompleteLabel: "Review safety" },
    { label: "Note ready", ready: noteReady, completeLabel: "Draft note ready", incompleteLabel: "Add note" },
  ]
  const readyCount = checks.filter((check) => check.ready).length
  const incompleteChecks = checks.filter((check) => !check.ready)
  const auditTrailLabel = checks
    .map((check) => (check.ready ? check.completeLabel : check.incompleteLabel))
    .join(" · ")
  const visibleSummary = readyCount === checks.length
    ? "Intake checked. Review before you send."
    : `Needs attention · ${incompleteChecks.map((check) => check.incompleteLabel.toLowerCase()).join(", ")}`

  return (
    <div
      className="flex text-[10px] font-medium text-muted-foreground sm:mr-auto sm:min-w-[180px]"
      data-action-readiness
      data-action-readiness-summary={auditTrailLabel}
      aria-label="Approval readiness checks"
      title={`${readyLabel} ${auditTrailLabel}`}
    >
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold",
          readyCount === checks.length
            ? "border-border/60 bg-background/70 text-muted-foreground"
            : "border-warning-border bg-warning-light text-warning",
        )}
        data-readiness-check
      >
        <CheckCircle className={cn("h-3.5 w-3.5", readyCount === checks.length ? "text-slate-600" : "text-warning")} aria-hidden />
        <span className="truncate">{visibleSummary}</span>
      </span>
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
    isAiPrefilled,
    noteDirty,
    isPending,
    isLoadingPreview,
    reloadReviewData,
    handleMedCertApprove,
    handleStatusChange,
    handleOpenParchmentPrescribe,
    handleApprovePrescribedScript,
    setShowDeclineDialog,
  } = useIntakeReview()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

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
        scriptSent: intake.script_sent,
      }),
    [
      answers,
      intake.category,
      intake.patient.full_name,
      intake.patient.date_of_birth,
      intake.patient.sex,
      intake.requires_live_consult,
      intake.script_sent,
      intake.risk_tier,
      intake.subtype,
      service?.type,
    ],
  )

  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)
  const isRepeatScript = service?.type === "repeat_rx" || service?.type === "common_scripts"
  const isPrescribingConsult = intake.category === "consult" && isPrescribingConsultSubtype(intake.subtype)
  const shouldPrescribeFromConsult = isPrescribingConsult && hasPrescriptionIntent
  const isActivePrescribingStatus = ["paid", "in_review", "awaiting_script"].includes(intake.status)
  const canShowConsultCompletion =
    isConsultServiceType(service?.type) &&
    (shouldPrescribeFromConsult ? isActivePrescribingStatus : intake.status === "paid")
  const canPrescribeInParchment =
    isActivePrescribingStatus &&
    ((isRepeatScript && caseSummary.recommendedPlan.action === "prescribe") || shouldPrescribeFromConsult)
  const canCompleteRecordedRepeatScript =
    isRepeatScript && intake.script_sent === true && isActivePrescribingStatus
  const recordedRepeatCompletionNeedsNote =
    canCompleteRecordedRepeatScript && getRepeatRxAttestationStatus(answers) !== "confirmed_unchanged"
  const recordedRepeatReconciliationReady =
    hasLegacyRepeatRxReconciliationNote(doctorNotes) && !isAiPrefilled && !noteDirty
  const reviewPacket = useMemo(() => buildReviewPacket({
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
    answers: answers ?? {},
    intake: {
      status: intake.status,
      script_sent: intake.script_sent,
    },
    summary: caseSummary,
  }), [
    answers,
    caseSummary,
    intake.category,
    intake.script_sent,
    intake.status,
    intake.subtype,
    service?.type,
  ])
  // Legacy repeat requests can still lack fields introduced after checkout.
  // The canonical packet owns both their display state and prescribing gate.
  const packetBlocker = useMemo(() => {
    return getReviewPacketBlocker(reviewPacket, doctorNotes)
  }, [doctorNotes, reviewPacket])
  // packetBlocker.blocked drives the disabled state + disabled-reason wiring.
  // The non-blocking warning (legacy repeat-Rx missing dose/indication WITH a
  // clinical note recorded) is surfaced as a visible calm line at the decision
  // point below (reviewPacketWarning) AND via the button title — not only the
  // request packet. Do NOT use packetBlocker.message for the disabled-reason —
  // only the blocked message gates, so this stays blocked-only.
  const reviewPacketBlockMessage = packetBlocker.blocked ? packetBlocker.message : null
  // Visible, non-gating nudge for the warning case (note recorded → confirm in Parchment).
  const reviewPacketWarning = packetBlocker.warning ? packetBlocker.message : null

  const needsClinicalNotes = !isClinicalNoteSufficient(doctorNotes)
  const approvalNeedsClinicalNotes =
    (service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status)) ||
    canShowConsultCompletion ||
    (reviewPacket.workflow.requiresFulfilment && isActivePrescribingStatus) ||
    (!isKnownDoctorServiceType(service?.type) && intake.status === "paid")
  const approveDisabledReason = recordedRepeatCompletionNeedsNote && !recordedRepeatReconciliationReady
    ? "Add and save a reconciliation note for the already-issued script before completing this legacy request."
    : approvalNeedsClinicalNotes && needsClinicalNotes
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
    : null
  const showActionReadiness = ["paid", "in_review", "awaiting_script"].includes(intake.status)
  const readyLabel = service?.type === "med_certs" ? "Certificate ready to send." : "Case ready to send."
  const patientFirstName = intake.patient.full_name?.trim().split(/\s+/)[0] || ""
  const refundRecipient = patientFirstName || "the patient"
  const declineLabel = showRefundOnDecline ? "Decline with reason" : "Decline request"
  const declineCaption = showRefundOnDecline
    ? refundShortLabel
      ? `Full refund if you decline: ${refundShortLabel} back to ${refundRecipient}.`
      : `Full refund if you decline. ${refundRecipient} is refunded.`
    : "Opens confirmation."
  const safetyReady =
    caseSummary.safetyItems.every((item) => (
      item.severity === "info" ||
      (recordedRepeatReconciliationReady && item.label === "Recorded script evidence needs reconciliation")
    )) &&
    intake.requires_live_consult !== true &&
    intake.risk_tier !== "high"
  const queueEnteredAt = getQueueEnteredAt(intake)
  const canApproveAfterPrescribe = intake.script_sent === true
  const isPrescribingWorkflow = reviewPacket.workflow.requiresFulfilment
  const canShowPrescribingCompletion = isPrescribingWorkflow && isActivePrescribingStatus
  const isActionDisabled = isPending || !isHydrated
  const approveAfterPrescribeTitle = hasPrescribingIdentityBlocker
    ? prescribingIdentityTitle
    : canApproveAfterPrescribe
      ? "Prescription recorded. Complete the request when ready."
      : "Complete or record the prescription in Parchment first."
  const prescribingApproveHint =
    canPrescribeInParchment && !hasPrescribingIdentityBlocker && !canApproveAfterPrescribe
      ? "Complete or record the prescription in Parchment first."
      : null
  const completionDisabledReason = isPrescribingWorkflow
    ? hasPrescribingIdentityBlocker
      ? prescribingIdentityTitle
      : !canApproveAfterPrescribe
        ? "Complete or record the prescription in Parchment first."
        : reviewPacketBlockMessage ?? approveDisabledReason
    : reviewPacketBlockMessage ?? approveDisabledReason
  const visibleDisabledHint =
    disabledApproveHint ??
    ((canShowConsultCompletion || canShowPrescribingCompletion) ? completionDisabledReason : approveDisabledReason) ??
    prescribingApproveHint

  const handlePrescribeClick = () => {
    handleOpenParchmentPrescribe()
  }

  return (
    <div
      className={
        placement === "top"
          ? "rounded-xl border border-border/60 bg-background p-2 shadow-sm shadow-primary/[0.03]"
          : "sticky bottom-0 z-30 shrink-0 border-t border-border bg-background/95 px-2 py-1.5 shadow-lg shadow-primary/[0.08] backdrop-blur supports-[backdrop-filter]:bg-background/90"
      }
      data-testid="operator-action-rail"
      data-review-action-rail="true"
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
      {reviewPacketWarning && (
        <p
          data-testid="review-packet-warning"
          className="mb-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"
        >
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          <span>{reviewPacketWarning}</span>
        </p>
      )}
      <div
        className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-6 [&>button]:w-full [&>div]:w-full sm:[&>button]:w-auto sm:[&>div]:w-auto"
        data-action-bar
      >
        {showActionReadiness ? (
          <DecisionWaitSignal queueEnteredAt={queueEnteredAt} />
        ) : null}
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
              aria-label={reviewPacket.workflow.completionLabel}
              className="h-7 bg-[#2563EB] px-2.5 text-xs text-white transition-colors hover:bg-[#1D4ED8]"
              disabled={isActionDisabled || isLoadingPreview || Boolean(approveDisabledReason)}
              title={approveDisabledReason || undefined}
              size="sm"
            >
              {isPending || isLoadingPreview ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1.5" />
              )}
              {isLoadingPreview ? "Loading..." : isPending ? "Approving..." : reviewPacket.workflow.completionLabel}
              <ShortcutHint tone="on-primary">Cmd+Enter</ShortcutHint>
            </Button>
            {requiresClinicalDetail ? (
              <Button
                onClick={onRequestClinicalDetail}
                variant="outline"
                className="h-7 border-border/70 bg-background px-2.5 text-xs text-foreground hover:bg-muted/40"
                disabled={isActionDisabled || isRequestingClinicalDetail || !onRequestClinicalDetail}
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

      {canShowPrescribingCompletion && (
        <>
          {canPrescribeInParchment && intake.script_sent !== true ? (
            <Button
              onClick={handlePrescribeClick}
              className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700"
              disabled={isActionDisabled || hasPrescribingIdentityBlocker || packetBlocker.blocked}
              title={packetBlocker.message ?? prescribingIdentityTitle}
              size="sm"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {prescribingActionLabel ?? "Prescribe"}
            </Button>
          ) : null}
          {canApproveAfterPrescribe ? (
            <span className="inline-flex h-7 items-center gap-1.5 px-1 text-xs font-semibold text-success" data-fulfilment-recorded>
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Prescription recorded
            </span>
          ) : null}
          <Button
            onClick={handleApprovePrescribedScript}
            className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
            disabled={isActionDisabled || Boolean(completionDisabledReason)}
            title={completionDisabledReason ?? approveAfterPrescribeTitle}
            aria-describedby={prescribingApproveHint ? "queue-prescribing-approve-hint" : undefined}
            size="sm"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
            {isPending ? "Completing..." : reviewPacket.workflow.completionLabel}
          </Button>
          {canPrescribeInParchment && intake.script_sent !== true
            ? (
              <MarkSentManuallyButton
                intakeId={intake.id}
                disabled={!isHydrated}
                reloadReviewData={reloadReviewData}
              />
            )
            : null}
        </>
      )}

      {/* Non-prescribing consults share the canonical completion label. */}
      {canShowConsultCompletion && !isPrescribingWorkflow && (
        <Button
          onClick={() => handleStatusChange("approved")}
          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
          disabled={isActionDisabled || Boolean(completionDisabledReason)}
          title={completionDisabledReason || undefined}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
          {isPending ? "Completing..." : reviewPacket.workflow.completionLabel}
        </Button>
      )}

      {/* Generic approve */}
      {!isKnownDoctorServiceType(service?.type) &&
        intake.status === "paid" && (
            <Button
              onClick={() => handleStatusChange("approved")}
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
              disabled={isActionDisabled || Boolean(approveDisabledReason)}
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
            variant="ghost"
            onClick={() => setShowDeclineDialog(true)}
            className="h-7 bg-transparent px-2 text-[11px] font-semibold text-destructive/85 shadow-none transition-colors hover:bg-destructive/5 hover:text-destructive focus-visible:text-destructive"
            disabled={isActionDisabled}
            size="sm"
            title={showRefundOnDecline ? "Shortcut: Cmd+Shift+D. Opens confirmation before refunding the patient." : "Shortcut: Cmd+Shift+D."}
            aria-keyshortcuts="Meta+Shift+D"
          >
            {declineLabel}
          </Button>
          <p
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold leading-tight",
              showRefundOnDecline
                ? "bg-transparent text-muted-foreground"
                : "text-muted-foreground",
            )}
            data-decline-confirmation-copy
          >
            {declineCaption}
          </p>
        </div>
      )}
      </div>
      {visibleDisabledHint && (
        <p
          id={prescribingApproveHint ? "queue-prescribing-approve-hint" : undefined}
          className="mt-2 inline-flex w-fit items-center rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-xs font-medium text-slate-600 dark:text-muted-foreground"
        >
          {visibleDisabledHint}
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
 * can record durable script completion before completing the request.
 *
 * Kept local to this file so the slide-over's existing action-rail
 * `useTransition` is not disturbed. On success, the selected review payload
 * reloads in place so the completion control unlocks without a page refresh.
 */
function MarkSentManuallyButton({
  intakeId,
  reloadReviewData,
  disabled = false,
}: {
  intakeId: string
  reloadReviewData: ReloadReviewData
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)
  const reasonInputRef = useRef<HTMLInputElement>(null)
  const referenceInputId = `mark-sent-parchment-reference-${intakeId}`
  const reasonInputId = `mark-sent-reason-${intakeId}`
  const panelId = `mark-sent-panel-${intakeId}`
  const titleId = `mark-sent-title-${intakeId}`
  const descriptionId = `mark-sent-description-${intakeId}`
  const setManualPanelOpen = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      persistManualScriptPanelIntakeId(intakeId)
    } else {
      clearManualScriptPanelIntakeId(intakeId)
    }
    setOpen(nextOpen)
  }, [intakeId])
  const reset = useCallback(() => {
    if (referenceInputRef.current) referenceInputRef.current.value = ""
    if (reasonInputRef.current) reasonInputRef.current.value = ""
  }, [])

  useEffect(() => {
    reset()
    setOpen(getStoredManualScriptPanelIntakeId() === intakeId)
  }, [intakeId, reset])

  const closeManualPanel = useCallback(() => {
    reset()
    setManualPanelOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [reset, setManualPanelOpen])

  useEffect(() => {
    if (!open) return
    window.setTimeout(() => referenceInputRef.current?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault()
        closeManualPanel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeManualPanel, isPending, open])

  const handleConfirm = () => {
    const externalReference = referenceInputRef.current?.value.trim() || ""
    const reasonNote = reasonInputRef.current?.value.trim() || ""
    if (!externalReference && !reasonNote) {
      toast.error("Reference or channel is required.")
      referenceInputRef.current?.focus()
      return
    }

    startTransition(async () => {
      const result = await markScriptSentAction(
        intakeId,
        reasonNote ? `Sent outside Parchment: ${reasonNote}` : undefined,
        externalReference || undefined,
      )
      if (result.success) {
        setManualPanelOpen(false)
        reset()
        const refreshed = await reloadReviewData({ background: true })
        if (!refreshed) {
          toast.success("Prescription recorded. Retry the status refresh to unlock completion.")
        }
      } else {
        toast.error(result.error || "Failed to mark script sent")
      }
    })
  }

  return (
    <div className="relative">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="fixed bottom-[4.5rem] left-2 right-2 z-50 grid gap-4 rounded-xl border border-border bg-card/95 p-4 text-left shadow-xl shadow-primary/[0.12] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[min(92vw,36rem)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0 space-y-1.5">
              <h2 id={titleId} className="text-base font-semibold leading-tight">
                Confirm sent outside Parchment
              </h2>
              <p id={descriptionId} className="text-sm leading-relaxed text-muted-foreground">
                Record this only after the script was sent through another channel.
                The patient is notified after you complete the request.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeManualPanel}
              disabled={isPending}
              aria-label="Close"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={referenceInputId}>
                Parchment or external reference
              </Label>
              <Input
                id={referenceInputId}
                ref={referenceInputRef}
                placeholder="e.g., PAR-12345"
                disabled={isPending || !open}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={reasonInputId}>
                Channel used (recorded in the audit log)
              </Label>
              <Input
                id={reasonInputId}
                ref={reasonInputRef}
                placeholder="e.g., Paper script handed to patient"
                disabled={isPending || !open}
              />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
            Reference or channel is required.
          </p>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeManualPanel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm sent
            </Button>
          </div>
        </div>
      ) : null}
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setManualPanelOpen(true)}
      >
        <ClipboardCheck className="h-4 w-4 mr-1.5" />
        {open ? "Recording outside Parchment" : "Sent outside Parchment"}
      </Button>
    </div>
  )
}
