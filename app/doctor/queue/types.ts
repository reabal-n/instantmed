import type { IntakeWithPatient } from "@/types/db"

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
}

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  doctorName?: string
  identityComplete?: boolean
  pagination?: PaginationInfo
}
