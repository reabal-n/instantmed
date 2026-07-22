"use client"

import { AlertTriangle, ChevronDown, Loader2, ShieldCheck } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { markBatchReviewedCohort } from "@/app/actions/batch-review-cert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { BATCH_REVIEW_DEADLINE_HOURS } from "@/lib/clinical/batch-review-policy"
import type { PendingBatchReviewResult } from "@/lib/data/intakes"
import { cn } from "@/lib/utils"

interface BatchReviewBannerProps {
  result: PendingBatchReviewResult
  onOpenOldest: (intakeId: string) => void
  /** Removes the attested intakes from client queue state after a cohort attest. */
  onCohortResolved?: (intakeIds: string[]) => void
  now?: Date
}

function hoursSince(timestamp: string | null | undefined, now: Date): number | null {
  if (!timestamp) return null
  const ms = new Date(timestamp).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.floor((now.getTime() - ms) / 3_600_000))
}

function ageFromDob(dob: string | null | undefined, now: Date): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (!Number.isFinite(birth.getTime())) return null
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export function BatchReviewBanner({
  result,
  onOpenOldest,
  onCohortResolved,
  now = new Date(),
}: BatchReviewBannerProps) {
  const [showList, setShowList] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (result.degraded) {
    return (
      <div
        className="flex shrink-0 flex-col gap-3 rounded-xl border border-warning-border bg-warning-light px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        role="status"
        data-testid="batch-review-banner-degraded"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Batch review status unavailable</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Refresh before relying on the post-approval review queue.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (result.total === 0) return null

  const oldestHours = hoursSince(result.oldestApprovedAt, now)
  const isOverdue = oldestHours !== null && oldestHours >= BATCH_REVIEW_DEADLINE_HOURS
  // The total can exceed the hydrated page; attest only what the doctor can see.
  const attestableIds = result.data.map((intake) => intake.id)
  const attestCount = attestableIds.length

  const handleAttestCohort = () => {
    if (isPending || attestCount === 0) return
    startTransition(async () => {
      const response = await markBatchReviewedCohort(attestableIds)
      if (!response.success) {
        toast.error(response.error || "Could not record the cohort review")
        return
      }
      const resolved = [...response.reviewedIds, ...response.skippedIds]
      toast.success(
        response.reviewedIds.length > 0
          ? `Governance review recorded for ${response.reviewedIds.length} certificate${response.reviewedIds.length === 1 ? "" : "s"}`
          : "Certificates were already resolved",
      )
      onCohortResolved?.(resolved)
    })
  }

  return (
    <div
      className="shrink-0 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm shadow-primary/[0.03]"
      role="status"
      data-testid="batch-review-banner"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {result.total} auto-approved certificate{result.total === 1 ? "" : "s"} awaiting governance review
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {oldestHours !== null ? `Oldest pending for ${oldestHours}h. ` : ""}
              Scan the cohort and attest within the {BATCH_REVIEW_DEADLINE_HOURS}-hour governance window, or open any certificate to spot-check or revoke.
              {isOverdue ? " The oldest review is overdue." : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowList((open) => !open)}
            aria-expanded={showList}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showList && "rotate-180")}
              aria-hidden="true"
            />
            {showList ? "Hide certificates" : `Show certificates (${attestCount})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const oldest = result.data[0]
              if (oldest) onOpenOldest(oldest.id)
            }}
          >
            Review oldest certificate
          </Button>
          {onCohortResolved ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || attestCount === 0}
                  data-testid="batch-review-attest-all"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  Attest cohort ({attestCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Record cohort governance review</AlertDialogTitle>
                  <AlertDialogDescription>
                    This records that you reviewed this cohort of {attestCount} auto-issued medical
                    certificate{attestCount === 1 ? "" : "s"} as a governance check, and stamps each as
                    reviewed by you. It is a cohort-level review, not a per-patient clinical
                    re-assessment. Open and revoke any certificate that needs correction before
                    attesting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAttestCohort}>
                    Attest {attestCount} certificate{attestCount === 1 ? "" : "s"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {showList ? (
        <ul
          className="mt-2.5 max-h-56 divide-y divide-border/40 overflow-y-auto rounded-lg border border-border/40"
          data-testid="batch-review-cohort-list"
        >
          {result.data.map((intake) => {
            const patientAge = ageFromDob(intake.patient?.date_of_birth, now)
            const approvedHours = hoursSince(intake.ai_approved_at ?? null, now)
            return (
              <li key={intake.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2.5 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  onClick={() => onOpenOldest(intake.id)}
                >
                  <span className="min-w-0 shrink-0 text-sm font-medium text-foreground">
                    {intake.patient?.full_name || "Unknown patient"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {patientAge !== null ? `${patientAge}y` : "—"}
                    {approvedHours !== null ? ` · approved ${approvedHours}h ago` : ""}
                  </span>
                  {intake.ai_approval_reason ? (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={intake.ai_approval_reason}>
                      {intake.ai_approval_reason}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
