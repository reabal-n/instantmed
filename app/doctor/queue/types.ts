import type { IntakeWithPatient } from "@/types/db"

export interface QueueClientProps {
  intakes: IntakeWithPatient[]
  doctorId: string
  doctorName?: string
}
