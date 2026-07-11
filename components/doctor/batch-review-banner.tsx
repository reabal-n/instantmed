"use client"

import { AlertTriangle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BATCH_REVIEW_DEADLINE_HOURS } from "@/lib/clinical/batch-review-policy"
import type { PendingBatchReviewResult } from "@/lib/data/intakes"

interface BatchReviewBannerProps {
  result: PendingBatchReviewResult
  onOpenOldest: (intakeId: string) => void
  now?: Date
}

function formatOldestAge(oldestApprovedAt: string | null, now: Date): string | null {
  if (!oldestApprovedAt) return null
  const approvedAt = new Date(oldestApprovedAt).getTime()
  if (!Number.isFinite(approvedAt)) return null
  const hours = Math.max(0, Math.floor((now.getTime() - approvedAt) / 3_600_000))
  return `${hours}h`
}

export function BatchReviewBanner({
  result,
  onOpenOldest,
  now = new Date(),
}: BatchReviewBannerProps) {
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

  const oldestAge = formatOldestAge(result.oldestApprovedAt, now)
  const isOverdue = oldestAge
    ? Number.parseInt(oldestAge, 10) >= BATCH_REVIEW_DEADLINE_HOURS
    : false

  return (
    <div
      className="flex shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm shadow-primary/[0.03] sm:flex-row sm:items-center sm:justify-between"
      role="status"
      data-testid="batch-review-banner"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {result.total} medical certificate{result.total === 1 ? "" : "s"} need doctor review
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {oldestAge ? `Oldest pending for ${oldestAge}. ` : ""}
            Review each certificate individually within the {BATCH_REVIEW_DEADLINE_HOURS}-hour governance window.
            {isOverdue ? " The oldest review is overdue." : ""}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0"
        onClick={() => {
          const oldest = result.data[0]
          if (oldest) onOpenOldest(oldest.id)
        }}
      >
        Review oldest certificate
      </Button>
    </div>
  )
}
