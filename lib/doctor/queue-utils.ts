/**
 * Queue utility functions - wait time, SLA countdown, severity.
 * Extracted from queue-client.tsx for testability.
 */

import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import type { IntakeStatus } from "@/types/intake"

export type WaitTimeSeverity = "normal" | "warning" | "critical"

export const QUEUE_REVIEW_STATUSES = [
  "paid",
  "in_review",
  "pending_info",
  "awaiting_script",
] as const satisfies readonly IntakeStatus[]

const QUEUE_FILTER_STATUSES = {
  all: QUEUE_REVIEW_STATUSES,
  review: ["paid", "in_review"],
  pending_info: ["pending_info"],
  scripts: ["awaiting_script"],
} as const satisfies Record<QueueStatusFilter, readonly IntakeStatus[]>

export function getQueueStatusesForFilter(
  filter: QueueStatusFilter,
): readonly IntakeStatus[] {
  return QUEUE_FILTER_STATUSES[filter]
}

type QueueStatusTone = "review" | "info" | "script"

export interface QueueStatusCounts {
  all: number
  review: number
  pending_info: number
  scripts: number
}

const QUEUE_STATUS_COUNT_FILTERS = ["all", "review", "pending_info", "scripts"] as const

export function resolveQueueStatusCounts(
  results: ReadonlyArray<{
    filter: QueueStatusFilter
    count: number
    error: unknown
  }>,
): QueueStatusCounts | null {
  if (results.some((result) => result.error)) return null

  const counts = new Map(results.map((result) => [result.filter, result.count]))
  if (QUEUE_STATUS_COUNT_FILTERS.some((filter) => !counts.has(filter))) return null

  return {
    all: counts.get("all") ?? 0,
    review: counts.get("review") ?? 0,
    pending_info: counts.get("pending_info") ?? 0,
    scripts: counts.get("scripts") ?? 0,
  }
}

export interface QueueTimestampInput {
  paid_at?: string | null
  submitted_at?: string | null
  created_at: string
}

export interface QueueStatusMeta {
  label: string
  tone: QueueStatusTone
}

type ReviewHistoryStatusTone = "approved" | "declined" | "completed" | "reviewed"

export interface ReviewHistoryStatusMeta {
  label: string
  tone: ReviewHistoryStatusTone
}

/** Use the moment the paid case truly entered the doctor queue. */
export function getQueueEnteredAt(intake: QueueTimestampInput): string {
  return intake.paid_at ?? intake.submitted_at ?? intake.created_at
}

/** Truthful compact status labels for queue scanning. */
export function getQueueStatusMeta(status: string): QueueStatusMeta {
  switch (status) {
    case "in_review":
      return { label: "In review", tone: "review" }
    case "pending_info":
      return { label: "Needs info", tone: "info" }
    case "awaiting_script":
      return { label: "Awaiting script", tone: "script" }
    case "paid":
    default:
      return { label: "Needs review", tone: "review" }
  }
}

/** Truthful outcome labels for actor-scoped review history. */
export function getReviewHistoryStatusMeta(status: string): ReviewHistoryStatusMeta {
  switch (status) {
    case "approved":
      return { label: "Approved", tone: "approved" }
    case "declined":
      return { label: "Declined", tone: "declined" }
    case "completed":
      return { label: "Completed", tone: "completed" }
    default:
      return { label: "Reviewed", tone: "reviewed" }
  }
}

/**
 * Describe a complete count or, when capped, the bounded review slice.
 *
 * The doctor's own decisions and protocol-issued certificates are counted
 * separately: "your reviews" must never absorb work no clinician performed.
 */
export function buildReviewHistorySummary({
  reviews,
  truncated,
  now,
}: {
  reviews: Array<{
    activity_at: string
    activity_provenance?: "clinician_decision" | "auto_issued"
  }>
  truncated: boolean
  now: Date
}): string {
  const clinicianReviews = reviews.filter(
    (review) => review.activity_provenance !== "auto_issued",
  )
  const autoIssuedCount = reviews.length - clinicianReviews.length
  // "Last reviewed" must describe a review the clinician actually performed, so
  // it is derived from their own decisions only — never from an auto-issuance.
  const lastReviewed = clinicianReviews
    .map((review) => review.activity_at)
    .sort()
    .pop() ?? null
  const countSummary = truncated
    ? `${clinicianReviews.length}+ reviews recorded today · latest ${clinicianReviews.length} shown`
    : `Your reviews today: ${clinicianReviews.length}`
  const reviewRelative = lastReviewed ? formatRelativeTime(lastReviewed, now) : ""
  const reviewSummary = reviewRelative
    ? `${countSummary} · last reviewed ${reviewRelative}`
    : countSummary
  if (autoIssuedCount <= 0) return reviewSummary

  return `${reviewSummary} · ${autoIssuedCount} auto-issued certificate${autoIssuedCount === 1 ? "" : "s"} today`
}

/**
 * Supabase realtime INSERT payloads contain only the intakes row, not joined
 * patient/service objects. The queue renderer needs those joins, so raw inserts
 * must trigger a server refresh instead of being appended directly.
 */
export function isHydratedQueueRealtimeInsert(
  row: unknown,
): row is {
  id: string
  patient: { id: string; full_name: string }
  service: { id: string; type?: string | null }
} {
  if (!row || typeof row !== "object") return false
  const record = row as Record<string, unknown>
  const patient = record.patient as Record<string, unknown> | null | undefined
  const service = record.service as Record<string, unknown> | null | undefined

  return Boolean(
    typeof record.id === "string" &&
      patient &&
      typeof patient.id === "string" &&
      typeof patient.full_name === "string" &&
      service &&
      typeof service.id === "string",
  )
}

/** Human-readable wait time from a created_at timestamp. */
export function calculateWaitTime(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
  return `${diffMins}m`
}

/** Live wait label with seconds during the first minute for visible queue rows. */
export function calculateLiveWaitTime(
  createdAt: string,
  now = new Date(),
  options: { afterFirstMinuteSecondsCadence?: number } = {},
): string {
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000))

  if (diffSeconds < 5) return "just now"
  if (diffSeconds < 60) return `${diffSeconds}s`

  if (options.afterFirstMinuteSecondsCadence) {
    const cadence = Math.max(1, Math.floor(options.afterFirstMinuteSecondsCadence))
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    const visibleSeconds = Math.floor(seconds / cadence) * cadence
    return visibleSeconds > 0 ? `${minutes}m ${visibleSeconds}s` : `${minutes}m`
  }

  return calculateWaitTime(createdAt, now)
}

/**
 * Schedule queue-row wait ticks at the next visible label boundary.
 *
 * A naive 60s interval can drift from the header's live wait signal by almost
 * a full minute because it starts from component mount time, not from the
 * case's queue-entered timestamp. This keeps minute-granular rows aligned
 * without repainting long queues every second once every row is older than
 * one minute.
 */
export function getQueueClockTickDelayMs(
  queueEnteredAtValues: Array<string | null | undefined>,
  now = new Date(),
  options: { postMinuteCadenceMs?: number } = {},
): number | null {
  const nowMs = now.getTime()
  const postMinuteCadenceMs = Math.max(1_000, options.postMinuteCadenceMs ?? 60_000)
  const ages = queueEnteredAtValues
    .map((value) => {
      if (!value) return null
      const enteredAt = new Date(value).getTime()
      if (!Number.isFinite(enteredAt)) return null
      return nowMs - enteredAt
    })
    .filter((age): age is number => typeof age === "number" && age >= 0)

  if (ages.length === 0) return null
  if (ages.some((age) => age < 60_000)) return 1_000

  const nextBoundaryMs = Math.min(
    ...ages.map((age) => {
      const elapsedInCadence = age % postMinuteCadenceMs
      return elapsedInCadence === 0 ? postMinuteCadenceMs : postMinuteCadenceMs - elapsedInCadence
    }),
  )

  return Math.max(1_000, Math.min(postMinuteCadenceMs, nextBoundaryMs))
}

/** Color-coding severity based on wait time or SLA deadline. */
export function getWaitTimeSeverity(
  createdAt: string,
  slaDeadline?: string | null,
  now = new Date(),
): WaitTimeSeverity {
  if (slaDeadline) {
    const deadline = new Date(slaDeadline)
    const diffMins = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60),
    )
    if (diffMins < 0) return "critical"
    if (diffMins < 30) return "warning"
    return "normal"
  }
  const created = new Date(createdAt)
  const diffMins = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60),
  )
  if (diffMins > 120) return "critical"
  if (diffMins >= 90) return "warning"
  return "normal"
}

/** SLA countdown string (e.g. "2h 15m left" or "10m overdue"). */
export function calculateSlaCountdown(
  slaDeadline: string | null | undefined,
  now = new Date(),
): string | null {
  if (!slaDeadline) return null
  const deadline = new Date(slaDeadline)
  const diffMs = deadline.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 0) {
    const overdueMins = Math.abs(diffMins)
    const overdueHours = Math.floor(overdueMins / 60)
    return overdueHours > 0
      ? `${overdueHours}h ${overdueMins % 60}m overdue`
      : `${overdueMins}m overdue`
  }
  const hours = Math.floor(diffMins / 60)
  return hours > 0 ? `${hours}h ${diffMins % 60}m left` : `${diffMins}m left`
}
