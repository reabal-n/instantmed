import "server-only"

import { toError } from "@/lib/errors"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("operational-controls")

export interface OperationalConfig {
  business_hours_enabled: boolean
  business_hours_open: number
  business_hours_close: number
  business_hours_timezone: string
  capacity_limit_enabled: boolean
  capacity_limit_max: number
  urgent_notice_enabled: boolean
  urgent_notice_message: string
  maintenance_scheduled_start: string | null
  maintenance_scheduled_end: string | null
}

export const DEFAULT_OPERATIONAL_CONFIG: OperationalConfig = {
  business_hours_enabled: true,
  business_hours_open: 8,
  business_hours_close: 22,
  business_hours_timezone: "Australia/Sydney",
  capacity_limit_enabled: false,
  capacity_limit_max: 100,
  urgent_notice_enabled: false,
  urgent_notice_message: "",
  maintenance_scheduled_start: null,
  maintenance_scheduled_end: null,
}

export async function getOperationalConfig(): Promise<OperationalConfig> {
  const flags = await getFeatureFlags()
  return {
    business_hours_enabled: flags.business_hours_enabled,
    business_hours_open: flags.business_hours_open,
    business_hours_close: flags.business_hours_close,
    business_hours_timezone: flags.business_hours_timezone,
    capacity_limit_enabled: flags.capacity_limit_enabled,
    capacity_limit_max: flags.capacity_limit_max,
    urgent_notice_enabled: flags.urgent_notice_enabled,
    urgent_notice_message: flags.urgent_notice_message,
    maintenance_scheduled_start: flags.maintenance_scheduled_start,
    maintenance_scheduled_end: flags.maintenance_scheduled_end,
  }
}

/**
 * Count intakes created today (Australia/Sydney) for capacity check
 */
export async function getTodayIntakeCount(): Promise<number> {
  const result = await readTodayIntakeCount()
  return result.ok ? result.count : 0
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
  const config = await getOperationalConfig()
  if (!config.capacity_limit_enabled) return false
  const count = await readTodayIntakeCount()
  if (!count.ok) {
    logger.error("Daily intake capacity count failed", {}, count.error)
    return true
  }

  return count.count >= config.capacity_limit_max
}

/**
 * Check if we're in a scheduled maintenance window
 */
export function isScheduledMaintenance(config: OperationalConfig): boolean {
  if (!config.maintenance_scheduled_start || !config.maintenance_scheduled_end) return false
  const now = new Date().getTime()
  const start = new Date(config.maintenance_scheduled_start).getTime()
  const end = new Date(config.maintenance_scheduled_end).getTime()
  return now >= start && now <= end
}
