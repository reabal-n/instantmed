import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("outbox-archival")

const DELIVERED_TTL_DAYS = 90
const FAILED_TTL_DAYS = 180
const BATCH_SIZE = 500

export interface ArchivalResult {
  deliveredDeleted: number
  failedDeleted: number
  error?: string
}

export async function archiveOldOutboxRows(): Promise<ArchivalResult> {
  const supabase = createServiceRoleClient()

  const deliveredCutoff = new Date(Date.now() - DELIVERED_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const failedCutoff = new Date(Date.now() - FAILED_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Delete old delivered/sent emails (90 days)
  const { data: deliveredRows, error: delError } = await supabase
    .from("email_outbox")
    .delete()
    .in("status", ["sent"])
    .in("delivery_status", ["delivered", "opened", "clicked"])
    .lt("created_at", deliveredCutoff)
    .select("id")
    .limit(BATCH_SIZE)

  if (delError) {
    logger.error("Failed to archive delivered emails", { error: delError.message })
    return { deliveredDeleted: 0, failedDeleted: 0, error: delError.message }
  }

  // Delete old exhausted-failed emails (180 days) - keeps recent failures for debugging
  const { data: failedRows, error: failError } = await supabase
    .from("email_outbox")
    .delete()
    .eq("status", "failed")
    .gte("retry_count", 10)
    .lt("created_at", failedCutoff)
    .select("id")
    .limit(BATCH_SIZE)

  if (failError) {
    logger.error("Failed to archive exhausted emails", { error: failError.message })
  }

  const deliveredDeleted = deliveredRows?.length || 0
  const failedDeleted = failedRows?.length || 0

  logger.info("Outbox archival complete", { deliveredDeleted, failedDeleted })

  return { deliveredDeleted, failedDeleted }
}
