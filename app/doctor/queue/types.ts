import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import type { PendingBatchReviewResult } from "@/lib/data/intakes"
import type { IntakeWithPatient, RecentlyCompletedIntake } from "@/types/db"
import type { PaginationInfo } from "@/types/shared"

export type { PaginationInfo }

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  identityComplete?: boolean
  queueDegraded?: boolean
  pagination?: PaginationInfo
  pendingBatchReviews?: PendingBatchReviewResult
  recentlyCompleted?: RecentlyCompletedIntake[]
  initialStatusFilter?: QueueStatusFilter
  hasExplicitStatusFilter?: boolean
  baseHref?: string
  doctorAvailable?: boolean
  compactShell?: boolean
}
