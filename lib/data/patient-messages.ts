import "server-only"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("data-patient-messages")

export interface PatientThreadMessage {
  id: string
  sender_type: "patient" | "doctor" | "system"
  content: string
  read_at: string | null
  created_at: string
}

export async function getPatientMessagesForIntake(
  intakeId: string,
  limit = 30,
): Promise<PatientThreadMessage[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("patient_messages")
    .select("id, sender_type, content, read_at, created_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 100))

  if (error) {
    logger.error("Failed to fetch patient message thread", { hasIntakeId: Boolean(intakeId) }, toError(error))
    return []
  }

  return (data ?? []).filter((message): message is PatientThreadMessage =>
    Boolean(
      message &&
        typeof message.id === "string" &&
        typeof message.content === "string" &&
        typeof message.created_at === "string" &&
        ["patient", "doctor", "system"].includes(String(message.sender_type)),
    ),
  )
}
