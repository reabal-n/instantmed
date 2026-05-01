/**
 * Queue utility functions - wait time, SLA countdown, severity.
 * Extracted from queue-client.tsx for testability.
 */

import type { IntakeStatus } from "@/types/intake"

export type WaitTimeSeverity = "normal" | "warning" | "critical"

export const QUEUE_REVIEW_STATUSES = [
  "paid",
  "in_review",
  "pending_info",
  "awaiting_script",
] as const satisfies readonly IntakeStatus[]

export type QueueReviewStatus = (typeof QUEUE_REVIEW_STATUSES)[number]
export type QueueStatusTone = "review" | "info" | "script"

export interface QueueTimestampInput {
  paid_at?: string | null
  submitted_at?: string | null
  created_at: string
}

export interface QueueStatusMeta {
  label: string
  tone: QueueStatusTone
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
  if (diffMins > 60) return "critical"
  if (diffMins > 30) return "warning"
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
