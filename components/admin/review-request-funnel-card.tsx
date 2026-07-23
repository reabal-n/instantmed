"use client"

import { MailCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { recordProductReviewTotalAction } from "@/app/actions/review-reputation"
import { DashboardCard, StatusBadge, type StatusBadgeStatus } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  ProductReviewSnapshotStatus,
  ReviewRequestFunnelSnapshot,
  ReviewRequestFunnelStatus,
} from "@/lib/admin/review-request-funnel"
import { formatDate } from "@/lib/format"

const MAX_PRODUCT_REVIEW_TOTAL = 1_000_000

const FUNNEL_BADGES: Record<ReviewRequestFunnelStatus, {
  label: string
  status: StatusBadgeStatus
}> = {
  degraded: { label: "Email funnel unavailable", status: "warning" },
  no_sends: { label: "No sends", status: "neutral" },
  baseline: { label: "Measurement baseline", status: "info" },
  live: { label: "Live", status: "success" },
}

const EXTERNAL_BADGES: Record<ProductReviewSnapshotStatus, {
  label: string
  status: StatusBadgeStatus
}> = {
  due: { label: "Snapshot due", status: "warning" },
  baseline: { label: "Baseline", status: "info" },
  live: { label: "Current", status: "success" },
  stale: { label: "Snapshot stale", status: "warning" },
  degraded: { label: "External total unavailable", status: "warning" },
}

function displayCount(value: number | null): string {
  return value === null ? "Unavailable" : value.toLocaleString("en-AU")
}

function displayTraversalRate(snapshot: ReviewRequestFunnelSnapshot): string {
  const { trackableSent, traversalRate } = snapshot.funnel
  if (trackableSent === null || traversalRate === null) return "No trackable rate yet"
  return `${traversalRate}% of ${trackableSent.toLocaleString("en-AU")} trackable sends`
}

function displayStageRate(
  numerator: number | null,
  denominator: number | null,
  denominatorLabel: string,
): string {
  if (numerator === null || denominator === null) return "Rate unavailable"
  if (denominator === 0) return `No ${denominatorLabel}`
  const rate = Math.round((numerator / denominator) * 1_000) / 10
  return `${rate}% of ${denominatorLabel}`
}

function displayExternalDelta(snapshot: ReviewRequestFunnelSnapshot): string {
  const { delta, status } = snapshot.external
  if (status === "due") return "Record the first baseline"
  if (status === "baseline") return "Baseline recorded"
  if (status === "stale" && delta === null) return "Baseline only; refresh due"
  if (delta === null) return "Change unavailable"
  if (delta === 0) return "No change since baseline"
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-AU")} since baseline`
}

export function ReviewRequestFunnelCard({
  snapshot,
}: {
  snapshot: ReviewRequestFunnelSnapshot
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [totalInput, setTotalInput] = useState(
    snapshot.external.total === null ? "" : String(snapshot.external.total),
  )
  const [inputError, setInputError] = useState<string | undefined>()
  const funnelBadge = FUNNEL_BADGES[snapshot.funnel.status]
  const externalBadge = EXTERNAL_BADGES[snapshot.external.status]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const total = Number(totalInput)
    if (
      totalInput.trim() === "" ||
      !Number.isInteger(total) ||
      total < 0 ||
      total > MAX_PRODUCT_REVIEW_TOTAL
    ) {
      setInputError("Enter a whole review total between 0 and 1,000,000.")
      return
    }

    setInputError(undefined)
    startTransition(async () => {
      try {
        const result = await recordProductReviewTotalAction(total)
        if (!result.success) {
          setInputError(result.error)
          toast.error(result.error || "Could not record the external review total")
          return
        }

        toast.success("External review total recorded")
        router.refresh()
      } catch {
        const error = "Could not record the external review total. Try again."
        setInputError(error)
        toast.error(error)
      }
    })
  }

  return (
    <DashboardCard padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <div className="flex items-center gap-2">
            <MailCheck aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Review requests</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Cohort {formatDate(snapshot.windowStart)}–{formatDate(snapshot.windowEnd)} · {snapshot.windowDays} days
          </p>
        </div>
        <StatusBadge status={funnelBadge.status} size="sm">
          {funnelBadge.label}
        </StatusBadge>
      </div>

      <div className="px-5 py-4">
        <dl className="grid overflow-hidden rounded-lg border border-border/60 bg-muted/30 sm:grid-cols-4 sm:divide-x sm:divide-border/60">
          <div className="border-b border-border/60 px-3 py-3 sm:border-b-0">
            <dt className="text-xs text-muted-foreground">Eligible</dt>
            <dd className="mt-1">
              <span className="block text-xl font-semibold tabular-nums text-foreground">
                {displayCount(snapshot.funnel.eligible)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">Fulfilled at least 48h ago</span>
            </dd>
          </div>
          <div className="border-b border-border/60 px-3 py-3 sm:border-b-0">
            <dt className="text-xs text-muted-foreground">Sent</dt>
            <dd className="mt-1">
              <span className="block text-xl font-semibold tabular-nums text-foreground">
                {displayCount(snapshot.funnel.sent)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {displayStageRate(snapshot.funnel.sent, snapshot.funnel.eligible, "eligible")}
              </span>
            </dd>
          </div>
          <div className="border-b border-border/60 px-3 py-3 sm:border-b-0">
            <dt className="text-xs text-muted-foreground">Delivered</dt>
            <dd className="mt-1">
              <span className="block text-xl font-semibold tabular-nums text-foreground">
                {displayCount(snapshot.funnel.delivered)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {displayStageRate(snapshot.funnel.delivered, snapshot.funnel.sent, "sent")}
              </span>
            </dd>
          </div>
          <div className="px-3 py-3">
            <dt className="text-xs text-muted-foreground">Unique email traversals</dt>
            <dd className="mt-1">
              <span className="block text-xl font-semibold tabular-nums text-foreground">
                {displayCount(snapshot.funnel.uniqueRedirectTraversals)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {displayTraversalRate(snapshot)}
              </span>
            </dd>
          </div>
        </dl>

        {snapshot.funnel.status === "degraded" ? (
          <p className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Email funnel unavailable. No counts are inferred while the aggregate query is degraded.
          </p>
        ) : snapshot.funnel.status === "baseline" ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Sent history exists, but there are no keyed sends in this window yet. Traversal measurement starts with the keyed cohort.
          </p>
        ) : snapshot.funnel.status === "no_sends" ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            No review-request emails were sent in this window.
          </p>
        ) : null}
      </div>

      <div className="border-t border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Externally posted reviews</h4>
              <StatusBadge status={externalBadge.status} size="sm">
                {externalBadge.label}
              </StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {displayCount(snapshot.external.total)}
              </span>
              <span className="text-xs text-muted-foreground">{displayExternalDelta(snapshot)}</span>
            </div>
            {snapshot.external.latestRecordedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last manually checked {formatDate(snapshot.external.latestRecordedAt)}
              </p>
            ) : null}
          </div>

          <form
            className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(220px,260px)_auto] sm:items-end"
            onSubmit={handleSubmit}
          >
            <Input
              id="productreview-review-total"
              label="Current external review total"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_PRODUCT_REVIEW_TOTAL}
              step={1}
              size="sm"
              value={totalInput}
              isInvalid={Boolean(inputError)}
              errorMessage={inputError}
              onChange={(event) => {
                setTotalInput(event.target.value)
                setInputError(undefined)
              }}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isPending}
              className="min-h-12 sm:min-h-0"
            >
              Record total
            </Button>
          </form>
        </div>
      </div>

      <p className="border-t border-border/60 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
        Email security scanners can open review links, so unique traversals are directional. External totals are manual snapshots and are not attributed to individual visits.
        <span className="mt-1 block font-medium text-foreground/80">
          Decision checkpoint: 15 Aug 2026, after at least two manual snapshots.
        </span>
      </p>
    </DashboardCard>
  )
}
