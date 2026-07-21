import type * as React from "react"

import type { WaitState } from "@/lib/brand/wait-counter-types"

/**
 * The honest wait signal on the page a waiting patient actually returns to.
 *
 * Prescriptions and consults are ~41% of paid orders and run a median of
 * roughly two hours (vs ~11 minutes for a medical certificate). Until now the
 * only thing those patients saw on return was "A doctor will review your
 * request as soon as one is available" — indistinguishable, at hour three,
 * from having been forgotten. The live wait device existed but rendered on
 * marketing pages and the ten-second success screen, so the customer saw it
 * before paying and never again.
 *
 * Two rules make this safe to show:
 *
 * 1. Descriptive, never a promise. It reports what recent requests actually
 *    did, in the past tense. It must never say "within" or otherwise imply a
 *    turnaround guarantee — CLAUDE.md forbids a customer-facing SLA.
 * 2. It must not go quiet exactly when it matters. Once a patient has waited
 *    longer than the median, quoting that median would read as a broken
 *    promise, so the copy switches to naming the overrun directly. Saying
 *    "this one is taking longer than most" is the honest sentence, and it is
 *    the one that answers the question the patient is actually asking.
 *
 * Renders nothing without real data (`variant: "live"`), so a metrics outage
 * degrades to the existing static copy rather than to a wrong number.
 */

const MIN_SAMPLE_SIZE = 3

export interface RequestWaitNoteProps {
  waitState?: WaitState | null
  /** When the patient paid — the clock they are actually experiencing. */
  paidAt?: string | null
  /** Static copy to show when there is no trustworthy median to quote. */
  fallback?: React.ReactNode
  now?: Date
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    const rounded = Math.max(5, Math.round(minutes / 5) * 5)
    return `${rounded} minutes`
  }
  const hours = minutes / 60
  if (hours < 2) return "an hour"
  return `${Math.round(hours)} hours`
}

export function RequestWaitNote({
  waitState,
  paidAt,
  fallback = null,
  now = new Date(),
}: RequestWaitNoteProps) {
  const median = waitState?.medianMinutes
  const hasTrustworthyMedian =
    waitState?.variant === "live" &&
    typeof median === "number" &&
    median > 0 &&
    // A median over one or two requests is noise, not a signal.
    (waitState.sampleSize ?? 0) >= MIN_SAMPLE_SIZE

  if (!hasTrustworthyMedian) return <>{fallback}</>

  const elapsedMinutes = paidAt
    ? Math.max(0, Math.round((now.getTime() - new Date(paidAt).getTime()) / 60000))
    : null

  const runningLong = elapsedMinutes !== null && elapsedMinutes > median

  return (
    <p className="text-muted-foreground">
      {runningLong
        ? "This one is taking longer than most today. It is still in the queue, and we will email you the moment there is a decision."
        : `Most requests like this were answered in about ${formatDuration(median as number)} over the last day. We will email you the moment there is a decision.`}
    </p>
  )
}
