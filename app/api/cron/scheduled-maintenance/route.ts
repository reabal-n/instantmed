import * as Sentry from "@sentry/nextjs"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { FLAG_KEYS } from "@/lib/data/types/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("scheduled-maintenance-cron")

/**
 * Scheduled Maintenance Cron
 *
 * Checks maintenance_scheduled_start and maintenance_scheduled_end from feature_flags.
 * When current time is within the window: sets maintenance_mode = true.
 * When outside the window: sets maintenance_mode = false.
 *
 * This keeps the maintenance banner in sync with the scheduled window.
 * Run every 5 minutes to catch window boundaries.
 */

const CRON_ACTOR = "cron:scheduled-maintenance"

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()

    const { data: flags } = await supabase
      .from("feature_flags")
      .select("key, value")
      .in("key", [
        FLAG_KEYS.MAINTENANCE_MODE,
        FLAG_KEYS.MAINTENANCE_SCHEDULED_START,
        FLAG_KEYS.MAINTENANCE_SCHEDULED_END,
      ])

    const byKey = Object.fromEntries(
      (flags || []).map((r) => [r.key, r.value])
    )
    const start = byKey[FLAG_KEYS.MAINTENANCE_SCHEDULED_START] as string | null
    const end = byKey[FLAG_KEYS.MAINTENANCE_SCHEDULED_END] as string | null
    const currentMode = byKey[FLAG_KEYS.MAINTENANCE_MODE] === true

    if (!start || !end) {
      return NextResponse.json({
        message: "No scheduled maintenance window configured",
        maintenance_mode: currentMode,
      })
    }

    const now = Date.now()
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    const inWindow = now >= startMs && now <= endMs

    let newMode = currentMode
    if (inWindow && !currentMode) {
      const { error } = await supabase
        .from("feature_flags")
        .upsert(
          {
            key: FLAG_KEYS.MAINTENANCE_MODE,
            value: true,
            updated_at: new Date().toISOString(),
            updated_by: CRON_ACTOR,
          },
          { onConflict: "key" }
        )
      if (error) {
        log.error("Failed to enable maintenance mode", { error: error.message })
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
      newMode = true
      revalidateTag("feature-flags")
      log.info("Maintenance mode enabled (scheduled window started)")
    } else if (!inWindow && currentMode) {
      const { error } = await supabase
        .from("feature_flags")
        .upsert(
          {
            key: FLAG_KEYS.MAINTENANCE_MODE,
            value: false,
            updated_at: new Date().toISOString(),
            updated_by: CRON_ACTOR,
          },
          { onConflict: "key" }
        )
      if (error) {
        log.error("Failed to disable maintenance mode", { error: error.message })
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
      newMode = false
      revalidateTag("feature-flags")
      log.info("Maintenance mode disabled (scheduled window ended)")
    }

    return NextResponse.json({
      message: "Scheduled maintenance check completed",
      in_window: inWindow,
      maintenance_mode: newMode,
    })
  } catch (error) {
    Sentry.captureException(error)
    log.error("Scheduled maintenance cron error", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
