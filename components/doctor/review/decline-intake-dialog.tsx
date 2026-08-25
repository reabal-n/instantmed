"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DECLINE_REASONS } from "@/lib/doctor/constants"
import { isFulfilmentEntitledPaymentStatus } from "@/lib/stripe/fulfilment-entitlement"
import { cn } from "@/lib/utils"
import type { DeclineReasonCode } from "@/types/db"

// The urgent-care draft directs the patient to the ED, so selecting it
// warrants a deliberate typed confirmation before the message is sent.
const TYPED_CONFIRM_REASONS: ReadonlySet<DeclineReasonCode> = new Set([
  "urgent_care_needed",
])

export function DeclineIntakeDialog() {
  const {
    intake,
    showDeclineDialog,
    setShowDeclineDialog,
    declineReasonCode,
    handleDeclineReasonCodeChange,
    declineReason,
    setDeclineReason,
    handleDecline,
    isPending,
  } = useIntakeReview()

  const [typedConfirm, setTypedConfirm] = useState("")
  const requiresTypedConfirm = TYPED_CONFIRM_REASONS.has(declineReasonCode)
  const typedConfirmValid =
    !requiresTypedConfirm || typedConfirm.trim().toUpperCase() === "DECLINE"

  const handleOpenChange = (next: boolean) => {
    if (!next && isPending) return
    if (!next) setTypedConfirm("")
    setShowDeclineDialog(next)
  }

  const handleConfirmDecline = (event: React.MouseEvent) => {
    event.preventDefault()
    if (!typedConfirmValid) return
    setTypedConfirm("")
    handleDecline()
  }

  // The current refund policy: every declined paid intake gets a 100%
  // refund. Surface that here so the doctor knows the patient gets
  // their money back when they confirm.
  const isPaid = isFulfilmentEntitledPaymentStatus(intake.payment_status)

  return (
    <AlertDialog open={showDeclineDialog} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Decline request</AlertDialogTitle>
          <AlertDialogDescription>
            Pick a reason and add details. The patient will be notified and,
            if they paid, refunded automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reason
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DECLINE_REASONS.map((reason, index) => {
                const active = reason.code === declineReasonCode
                const spansRow =
                  DECLINE_REASONS.length % 2 === 1 &&
                  index === DECLINE_REASONS.length - 1
                return (
                  <button
                    key={reason.code}
                    type="button"
                    aria-pressed={active}
                    disabled={isPending}
                    onClick={() => {
                      handleDeclineReasonCodeChange(reason.code)
                      setTypedConfirm("")
                    }}
                    className={cn(
                      "inline-flex h-11 items-center justify-start gap-2 rounded-md border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 sm:h-9",
                      spansRow && "sm:col-span-2",
                      active
                        ? "border-primary/60 bg-primary/10 text-primary-strong"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="truncate">{reason.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decline-details" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Details for the patient
            </Label>
            <Textarea
              id="decline-details"
              placeholder="Be specific. This text appears in the patient email."
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              rows={4}
              disabled={isPending}
            />
          </div>

          {isPaid ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                This is a paid intake. Confirming decline will issue a full
                Stripe refund to the patient.
              </span>
            </div>
          ) : null}

          {requiresTypedConfirm ? (
            <div className="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <Label
                htmlFor="decline-typed-confirm"
                className="text-xs font-medium text-destructive"
              >
                Type <span className="font-mono font-semibold">DECLINE</span> to confirm
              </Label>
              <Input
                id="decline-typed-confirm"
                value={typedConfirm}
                onChange={(event) => setTypedConfirm(event.target.value)}
                placeholder="DECLINE"
                disabled={isPending}
                className="h-8 text-sm"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">
                This reason is operator judgment, so we slow down the click.
              </p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDecline}
            disabled={!declineReason.trim() || !typedConfirmValid || isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
            Decline request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
