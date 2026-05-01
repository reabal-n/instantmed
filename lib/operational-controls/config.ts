import "server-only"

import { toError } from "@/lib/errors"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("operational-controls")

interface CapacityConfig {
  capacity_limit_enabled: boolean
  capacity_limit_max: number
}

async function getCapacityConfig(): Promise<CapacityConfig> {
  const flags = await getFeatureFlags()
  return {
    capacity_limit_enabled: flags.capacity_limit_enabled,
    capacity_limit_max: flags.capacity_limit_max,
  }
}

async function readTodayIntakeCount(): Promise<
  | { ok: true; count: number }
  | { ok: false; error: Error }
> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("count_intakes_today_sydney")
  if (error) {
    return { ok: false, error: toError(error) }
  }

  return { ok: true, count: Number(data ?? 0) }
}

/**
 * Check if at capacity (daily limit reached).
 * If the capacity switch is enabled but the counter fails, fail closed so a
 * broken RPC cannot bypass an explicit operations safety limit.
 */
export async function isAtCapacity(): Promise<boolean> {
  const config = await getCapacityConfig()
  if (!config.capacity_limit_enabled) return false
  const count = await readTodayIntakeCount()
  if (!count.ok) {
    logger.error("Daily intake capacity count failed", {}, count.error)
    return true
  }

  return count.count >= config.capacity_limit_max
}
