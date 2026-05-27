import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import type { FormToInboxStats } from "@/lib/data/intakes"
import type { IntakeWithPatient } from "@/types/db"
import type { PaginationInfo } from "@/types/shared"

export type { PaginationInfo }

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  identityComplete?: boolean
  queueDegraded?: boolean
  pagination?: PaginationInfo
  aiApprovedIntakes?: IntakeWithPatient[]
  recentlyCompleted?: IntakeWithPatient[]
  formToInboxStats?: FormToInboxStats | null
  todayEarnings?: number
  initialStatusFilter?: QueueStatusFilter
  hasExplicitStatusFilter?: boolean
  baseHref?: string
  doctorAvailable?: boolean
  compactShell?: boolean
}
