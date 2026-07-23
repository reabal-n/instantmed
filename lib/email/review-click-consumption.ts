import "server-only"

import { hashReviewClickKey } from "@/lib/email/review-click-key"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("review-click-consumption")

/**
 * Atomically consume the first traversal of one keyed review-request link.
 * Invalid and repeated keys return false. The raw capability is never stored,
 * logged, or returned from this boundary.
 */
export async function consumeReviewClickKey(rawKey: string): Promise<boolean> {
  const clickKeyHash = hashReviewClickKey(rawKey)
  if (!clickKeyHash) return false

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("consume_review_request_click", {
    p_click_key_hash: clickKeyHash,
  })

  if (error) {
    logger.error("Review click consume RPC failed", { code: error.code })
    throw new Error("Review click measurement is unavailable")
  }

  return data === true
}
