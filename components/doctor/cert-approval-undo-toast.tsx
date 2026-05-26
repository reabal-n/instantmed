"use client"

/**
 * Cert Approval Undo Toast
 *
 * Sonner custom toast that gives the doctor a 30-second window to retract a
 * fresh med cert approval. While the countdown ticks, the patient email is
 * still sitting in `email_outbox` with `scheduled_for` set; clicking Undo
 * deletes the queued email, revokes the cert, and flips the intake back to
 * in_review.
 *
 * The countdown length lives in `lib/clinical/undo-cert-window.ts` as
 * `UNDO_CERT_WINDOW_SECONDS`, shared by the server action, the cert pipeline,
 * and this client toast.
 */

import { CheckCircle2, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { undoCertApprovalAction } from "@/app/actions/undo-cert-approval"
import { Button } from "@/components/ui/button"
import { UNDO_CERT_WINDOW_SECONDS } from "@/lib/clinical/undo-cert-window"

interface CertApprovalUndoToastProps {
  toastId: string | number
  intakeId: string
  /**
   * When the deferred email is scheduled to fire (ISO timestamp). The toast
   * ticks down to this exact moment so the visible countdown matches the
   * dispatcher's actual cutoff, not a client-side guess.
   */
  scheduledFor: string
  /**
   * Friendly recipient label rendered in the toast description so the doctor
   * sees who the email is going to. Falls back to "patient" if unknown.
   */
  patientName?: string
  /** Called after a successful undo so the caller can refresh the queue. */
  onUndone?: () => void
}

export function CertApprovalUndoToast({
  toastId,
  intakeId,
  scheduledFor,
  patientName,
  onUndone,
}: CertApprovalUndoToastProps) {
  const deadlineMs = useRef(new Date(scheduledFor).getTime())
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((deadlineMs.current - Date.now()) / 1000)),
  )
  const [isPending, startTransition] = useTransition()
  const [undone, setUndone] = useState(false)

  // Tick the countdown once per second. Stops when the window closes or the
  // doctor undoes manually so we do not keep timers running after dismissal.
  useEffect(() => {
    if (undone || remainingSeconds <= 0) return
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadlineMs.current - Date.now()) / 1000))
      setRemainingSeconds(next)
      if (next <= 0) {
        clearInterval(interval)
        // Quietly dismiss the toast once the email has been sent - the
        // doctor can no longer undo, so the prompt is misleading.
        toast.dismiss(toastId)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds, undone, toastId])

  const handleUndo = () => {
    if (isPending || undone || remainingSeconds <= 0) return
    startTransition(async () => {
      const result = await undoCertApprovalAction({ intakeId })
      if (result.success) {
        setUndone(true)
        toast.dismiss(toastId)
        toast.success("Approval undone. Case returned to queue.", {
          description: "The patient was not notified.",
        })
        onUndone?.()
      } else {
        toast.error(result.error || "Undo failed", {
          description: "The cert email may already have been sent.",
        })
        toast.dismiss(toastId)
      }
    })
  }

  const windowClosed = remainingSeconds <= 0 || undone

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 bg-white p-3 shadow-md dark:bg-card">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Certificate issued</p>
        <p className="text-xs text-muted-foreground">
          {patientName ? `Email to ${patientName} in` : "Email going out in"}{" "}
          <span
            className="tabular-nums font-medium text-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {remainingSeconds}s
          </span>
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={handleUndo}
        disabled={windowClosed || isPending}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {isPending ? "Undoing" : "Undo"}
      </Button>
    </div>
  )
}

/**
 * Surface the undo toast. Caller passes the approval result's
 * `emailScheduledFor` plus the intake context; we own the toast lifecycle.
 */
export function showCertApprovalUndoToast(opts: {
  intakeId: string
  scheduledFor: string
  patientName?: string
  onUndone?: () => void
}) {
  toast.custom(
    (id) => (
      <CertApprovalUndoToast
        toastId={id}
        intakeId={opts.intakeId}
        scheduledFor={opts.scheduledFor}
        patientName={opts.patientName}
        onUndone={opts.onUndone}
      />
    ),
    { duration: UNDO_CERT_WINDOW_SECONDS * 1000 },
  )
}
