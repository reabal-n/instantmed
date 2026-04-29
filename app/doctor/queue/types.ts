import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import type { IntakeWithPatient } from "@/types/db"
import type { PaginationInfo } from "@/types/shared"

export type { PaginationInfo }

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  identityComplete?: boolean
  pagination?: PaginationInfo
  aiApprovedIntakes?: IntakeWithPatient[]
  recentlyCompleted?: IntakeWithPatient[]
  todayEarnings?: number
  initialStatusFilter?: QueueStatusFilter
  hasExplicitStatusFilter?: boolean
}
