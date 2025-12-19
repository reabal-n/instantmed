import type { RequestWithPatient } from "@/types/db"

export interface QueueClientProps {
  requests: RequestWithPatient[]
  doctorId: string
  doctorName?: string
}
