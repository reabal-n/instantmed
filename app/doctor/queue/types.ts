import type { RequestWithPatient } from "@/types/db"

export interface QueueClientProps {
  requests: RequestWithPatient[]
  doctorId: string
  doctorName?: string
  formatCategory: (category: string | null) => string
  formatSubtype: (subtype: string | null) => string
}
