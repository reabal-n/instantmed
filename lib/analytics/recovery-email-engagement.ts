import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("recovery-email-engagement")

export async function recordRecoveryEmailEngagement({
  intakeId,
  patientId,
  supabase,
}: {
  intakeId: string
  patientId?: string
  supabase: SupabaseClient
}): Promise<boolean> {
  try {
    let query = supabase
      .from("intakes")
      .update({ recovery_email_engaged_at: new Date().toISOString() })
      .eq("id", intakeId)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])

    if (patientId) query = query.eq("patient_id", patientId)

    const { data, error } = await query.select("id").maybeSingle()
    if (!error) return Boolean(data)

    logger.error(
      "Failed to record recovery email engagement",
      {},
      new Error(error.message),
    )
    return false
  } catch (error) {
    logger.error(
      "Failed to record recovery email engagement",
      {},
      error instanceof Error ? error : new Error("Unknown recovery marker error"),
    )
    return false
  }
}
