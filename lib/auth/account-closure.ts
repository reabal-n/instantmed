import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("closed-auth-account")

/**
 * Returns whether the Supabase Auth identity has been permanently closed.
 * Database failures throw so profile creation fails closed instead of silently
 * resurrecting access.
 */
export async function hasClosedAuthAccountTombstone(authUserId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("closed_auth_accounts")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error) {
    log.error("Failed to check closed auth account tombstone", {
      authUserId,
      code: error.code,
    }, error)
    throw new Error("Unable to verify account closure state")
  }

  return Boolean(data)
}
