import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import type { PendingBatchReviewResult } from "@/lib/data/intakes"
import type { QueueStatusCounts } from "@/lib/doctor/queue-utils"
import type {
  GovernanceReviewReceipt,
  IntakeWithPatient,
  RecentlyCompletedIntake,
} from "@/types/db"
import type { PaginationInfo } from "@/types/shared"

export type { PaginationInfo }

export type QueueSearchState = "idle" | "ready" | "unavailable" | "too_broad"

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  identityComplete?: boolean
  queueDegraded?: boolean
  pagination?: PaginationInfo
  pendingBatchReviews?: PendingBatchReviewResult
  recentlyCompleted?: RecentlyCompletedIntake[]
  governanceReceipt?: GovernanceReviewReceipt | null
  recentlyCompletedDegraded?: boolean
  recentlyCompletedTruncated?: boolean
  statusCounts?: QueueStatusCounts | null
  globalStatusCounts?: QueueStatusCounts | null
  oldestWaitingIntakeId?: string | null
  initialStatusFilter?: QueueStatusFilter
  hasExplicitStatusFilter?: boolean
  baseHref?: string
  doctorAvailable?: boolean
  allowSeededSearch?: boolean
  onlySeededSearch?: boolean
  compactShell?: boolean
}
