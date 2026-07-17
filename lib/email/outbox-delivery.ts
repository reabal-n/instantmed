import "server-only"

import type { SendEmailResult } from "@/lib/email/send/types"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * A duplicate guard is not proof that the earlier attempt was delivered.
 * Callers may stamp their one-shot marker only after the durable outbox row is
 * actually sent (or intentionally skipped in E2E).
 */
export async function isEmailSendDeliveryConfirmed(
  result: SendEmailResult,
): Promise<boolean> {
  if (!result.success || !result.outboxId) return false

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("email_outbox")
    .select("status")
    .eq("id", result.outboxId)
    .maybeSingle()

  if (error || !data) return false
  return data.status === "sent" || data.status === "skipped_e2e"
}
