import "server-only"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { revalidateTag } from "next/cache"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createLogger } from "@/lib/observability/logger"
import { toError } from "@/lib/errors"

const logger = createLogger("operational-config")

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

export const OP_CONFIG_KEYS = {
  BUSINESS_HOURS_ENABLED: "business_hours_enabled",
  BUSINESS_HOURS_OPEN: "business_hours_open",
  BUSINESS_HOURS_CLOSE: "business_hours_close",
  BUSINESS_HOURS_TIMEZONE: "business_hours_timezone",
  CAPACITY_LIMIT_ENABLED: "capacity_limit_enabled",
  CAPACITY_LIMIT_MAX: "capacity_limit_max",
  URGENT_NOTICE_ENABLED: "urgent_notice_enabled",
  URGENT_NOTICE_MESSAGE: "urgent_notice_message",
  MAINTENANCE_SCHEDULED_START: "maintenance_scheduled_start",
  MAINTENANCE_SCHEDULED_END: "maintenance_scheduled_end",
} as const

export type OpConfigKey = (typeof OP_CONFIG_KEYS)[keyof typeof OP_CONFIG_KEYS]

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
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
 * Check if current time is within business hours (AEST/AEDT)
 */
export function isWithinBusinessHours(config: OperationalConfig): boolean {
  if (!config.business_hours_enabled) return true
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: config.business_hours_timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10)
  const currentMinutes = hour * 60 + minute
  const openMinutes = config.business_hours_open * 60
  const closeMinutes = config.business_hours_close * 60
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

/**
 * Get formatted "back at" time for display
 */
export function getNextOpenTime(config: OperationalConfig): string {
  const open = config.business_hours_open
  const hour = open % 24
  const ampm = hour >= 12 ? "pm" : "am"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}${ampm}`
}

/**
 * Check if platform is closed (outside business hours)
 */
export async function isOutsideBusinessHours(): Promise<{ closed: boolean; nextOpen?: string }> {
  const config = await getOperationalConfig()
  if (!config.business_hours_enabled) return { closed: false }
  const within = isWithinBusinessHours(config)
  if (within) return { closed: false }
  return { closed: true, nextOpen: getNextOpenTime(config) }
}

/**
 * Count intakes created today (Australia/Sydney) for capacity check
 */
export async function getTodayIntakeCount(): Promise<number> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("count_intakes_today_sydney")
  if (error) return 0
  return Number(data ?? 0)
}

/**
 * Check if at capacity (daily limit reached)
 */
export async function isAtCapacity(): Promise<boolean> {
  const config = await getOperationalConfig()
  if (!config.capacity_limit_enabled) return false
  const count = await getTodayIntakeCount()
  return count >= config.capacity_limit_max
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

export async function updateOperationalConfig(
  key: OpConfigKey,
  value: boolean | number | string | null,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: "Database unavailable" }

  try {
    const { data: oldData } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", key)
      .single()

    const jsonValue = value === null ? null : value
    const { error } = await supabase
      .from("feature_flags")
      .upsert(
        {
          key,
          value: jsonValue,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        },
        { onConflict: "key" }
      )

    if (error) {
      logger.error("Update error", {}, toError(error))
      return { success: false, error: error.message }
    }

    await logAuditEvent({
      action: "settings_changed",
      actorId: updatedBy,
      actorType: "admin",
      metadata: {
        flag_key: key,
        old_value: oldData?.value,
        new_value: value,
        action_type: "operational_config_updated",
      },
    })

    revalidateTag("feature-flags")
    return { success: true }
  } catch (error) {
    logger.error("Unexpected error", {}, toError(error))
    return { success: false, error: "Unexpected error" }
  }
}
