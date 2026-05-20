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
  direction: "asc" | "desc" = "asc",
): Promise<PatientThreadMessage[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("patient_messages")
    .select("id, sender_type, content, read_at, created_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: direction === "asc" })
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

/**
 * Counts the patient's unread messages from doctors and the system across
 * all their intakes. Used to badge the patient mobile nav.
 *
 * "Unread" = sender_type in ('doctor', 'system') AND read_at IS NULL,
 * scoped to intakes belonging to this patient.
 *
 * Returns 0 on Supabase error (badge is advisory, never blocks UI).
 */
export async function getPatientUnreadMessageCount(patientId: string): Promise<number> {
  if (!patientId) return 0
  const supabase = createServiceRoleClient()

  const { data: intakes, error: intakeErr } = await supabase
    .from("intakes")
    .select("id")
    .eq("patient_id", patientId)

  if (intakeErr) {
    logger.error(
      "Failed to fetch patient intakes for unread count",
      { hasPatientId: Boolean(patientId) },
      toError(intakeErr),
    )
    return 0
  }

  const intakeIds = (intakes ?? []).map((row) => row?.id).filter((id): id is string => typeof id === "string")
  if (intakeIds.length === 0) return 0

  const { count, error } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .in("intake_id", intakeIds)
    .in("sender_type", ["doctor", "system"])
    .is("read_at", null)

  if (error) {
    logger.error(
      "Failed to count patient unread messages",
      { hasPatientId: Boolean(patientId) },
      toError(error),
    )
    return 0
  }

  return count ?? 0
}
