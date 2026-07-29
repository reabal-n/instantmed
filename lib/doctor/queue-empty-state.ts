import {
  type QueueStatusFilter,
  STAFF_IDENTITY_HREF,
} from "@/lib/dashboard/routes"
import { buildReviewHistorySummary } from "@/lib/doctor/queue-utils"
import type {
  GovernanceReviewReceipt,
  RecentlyCompletedIntake,
} from "@/types/db"

export interface QueueEmptyState {
  title: string
  description: string
  tone: "success" | "warning" | "neutral"
  actionHref?: string
  actionLabel?: string
  summary?: string | null
}

export function getQueueCompletionOutcome({
  hasNextVisibleCase,
  totalBeforeAction,
}: {
  hasNextVisibleCase: boolean
  totalBeforeAction: number
}): { message: string; forceRefresh: boolean } {
  if (hasNextVisibleCase) {
    return { message: "Case done. Opening next.", forceRefresh: false }
  }
  if (totalBeforeAction > 1) {
    return { message: "Case done. Loading remaining queue.", forceRefresh: true }
  }
  return { message: "Case done. Queue clear.", forceRefresh: false }
}

export function buildQueueEmptyState({
  doctorAvailable,
  queueDegraded,
  totalCount,
  statusFilter,
  searchQuery,
  baseHref,
  recentlyCompleted,
  governanceReceipt,
  recentlyCompletedDegraded,
  recentlyCompletedTruncated,
  now,
}: {
  doctorAvailable: boolean
  queueDegraded: boolean
  totalCount: number
  statusFilter: QueueStatusFilter
  searchQuery: string
  baseHref: string
  recentlyCompleted: RecentlyCompletedIntake[]
  governanceReceipt: GovernanceReviewReceipt | null
  recentlyCompletedDegraded: boolean
  recentlyCompletedTruncated: boolean
  now: Date
}): QueueEmptyState {
  if (queueDegraded) {
    return {
      title: "Queue data unavailable",
      description: "The current queue could not be loaded completely. Refresh before relying on this view.",
      tone: "warning",
      summary: null,
    }
  }

  if (!doctorAvailable && totalCount === 0) {
    return {
      title: "Availability is paused",
      description: "Your queue can look empty while review availability is off. Turn availability back on before relying on this view.",
      tone: "warning",
      actionHref: STAFF_IDENTITY_HREF,
      actionLabel: "Open availability",
    }
  }

  if (searchQuery.trim() || statusFilter !== "all") {
    if (statusFilter === "scripts" && !searchQuery.trim()) {
      return {
        title: "No scripts to write",
        description: "No scripts waiting right now.",
        tone: "neutral",
        actionHref: baseHref,
        actionLabel: "Open full queue",
      }
    }

    if (statusFilter === "pending_info" && !searchQuery.trim()) {
      return {
        title: "No patient replies",
        description: "No patient replies waiting right now.",
        tone: "neutral",
        actionHref: baseHref,
        actionLabel: "Open full queue",
      }
    }

    return {
      title: "No matches for this filter",
      description: "Cases may still exist in another status or outside the current filter. Clear filters to see the whole queue.",
      tone: "neutral",
      actionHref: baseHref,
      actionLabel: "Clear filters",
    }
  }

  if (totalCount > 0) {
    return {
      title: "This queue page is empty",
      description: "Cases still exist on an earlier page. Return to the first page before relying on this view.",
      tone: "warning",
      actionHref: baseHref,
      actionLabel: "Open first page",
      summary: null,
    }
  }

  if (recentlyCompletedDegraded) {
    return {
      title: "Review history unavailable",
      description: "The queue is empty, but today's review history could not be loaded. Refresh before relying on this view.",
      tone: "warning",
      summary: null,
    }
  }

  return {
    title: "No review cases right now",
    description: "Paid clinical work, pending replies, and scripts will appear here automatically.",
    tone: "success",
    summary: buildReviewHistorySummary({
      reviews: recentlyCompleted,
      truncated: recentlyCompletedTruncated,
      governanceReceipt,
      now,
    }),
  }
}
