import { isPrescribingServiceRequest, SERVICE_TYPES } from "@/lib/doctor/service-types"
import type { IntakeStatus } from "@/types/db"

export interface StaffCaseActionInput {
  status: IntakeStatus | string
  subtype?: string | null
}

export function resolveStaffCaseActionLabel(
  intake: StaffCaseActionInput,
  serviceType?: string | null,
): string {
  if (intake.status === "pending_info") return "Waiting on patient"
  if (intake.status === "awaiting_script") return "Send script"
  if (intake.status === "approved") {
    if (serviceType === SERVICE_TYPES.MED_CERTS) return "Check certificate delivery"
    return "Finish delivery"
  }
  if (intake.status === "completed") return "Complete"
  if (intake.status === "declined") return "Declined"
  if (serviceType === SERVICE_TYPES.MED_CERTS) return "Approve certificate"
  if (isPrescribingServiceRequest(serviceType, intake.subtype)) return "Prescribe"
  return "Approve or decline"
}
