"use client"

import { CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { recordHistoricalAutoIssuedNoCorrectionAction } from "@/app/actions/historical-auto-issued-review"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ADMIN_HISTORICAL_AUTO_ISSUED_REVIEW_HREF } from "@/lib/dashboard/routes"

export function HistoricalAutoIssuedReviewActions({
  intakeId,
  canRecord,
  unavailableReason,
}: {
  intakeId: string
  canRecord: boolean
  unavailableReason?: string
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const recordNoCorrection = () => {
    if (!canRecord || isPending) return
    startTransition(async () => {
      const result = await recordHistoricalAutoIssuedNoCorrectionAction({ intakeId })
      if (!result.success) {
        toast.error(result.error || "Could not record this review")
        return
      }

      toast.success("Review recorded — no correction required")
      setConfirmOpen(false)
      router.push(ADMIN_HISTORICAL_AUTO_ISSUED_REVIEW_HREF)
      router.refresh()
    })
  }

  return (
    <section
      className="rounded-xl border border-info-border bg-info-light/40 p-3"
      aria-label="Historical Medical Director review outcome"
      data-testid="historical-auto-issued-review-actions"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Historical safety review</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose one outcome after reviewing the complete case: record no correction, or revoke the certificate below.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0 bg-background md:min-h-8"
          disabled={!canRecord || isPending}
          onClick={() => setConfirmOpen(true)}
          data-testid="historical-no-correction-trigger"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Record no correction required
        </Button>
      </div>

      {!canRecord && unavailableReason ? (
        <p className="mt-2 text-xs font-medium text-warning" role="status">
          {unavailableReason}
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record no correction required?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm only after you have personally reviewed the patient answers, safety flags, clinical note, and issued certificate. This adds an immutable receipt for this exact certificate version; it does not change the certificate or the original decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep reviewing</AlertDialogCancel>
            <Button
              type="button"
              disabled={!canRecord || isPending}
              onClick={recordNoCorrection}
              data-testid="historical-no-correction-confirm"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Confirm no correction required
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
