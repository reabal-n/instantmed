import { NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { hasStaffAccess } from "@/lib/auth/staff-capabilities"
import { getSystemHealth, UNKNOWN_SYSTEM_HEALTH } from "@/lib/data/system-health"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("system-health-api")

export const dynamic = "force-dynamic"

/**
 * Phase 2 of dashboard remaster (2026-05-12). Powers the SystemHealthPill in
 * the staff dashboard header. Returns the recovery-surface counts every 45s
 * via the client poll, plus on initial server render via the dashboard page.
 *
 * Access: any staff role (admin / doctor / support). Counts are not PHI.
 */
export async function GET() {
  const authResult = await getApiAuth()
  if (!authResult || !hasStaffAccess(authResult.profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const health = await getSystemHealth()
    return NextResponse.json(health)
  } catch (error) {
    // A failed health read is NOT all-clear. Return the unknown shape so the
    // pill renders a degraded state instead of silently hiding, and report at
    // error level so the failure reaches Sentry.
    log.error(
      "Failed to load system health",
      {},
      error instanceof Error ? error : new Error(`system health read failed: ${String(error)}`),
    )
    return NextResponse.json(UNKNOWN_SYSTEM_HEALTH)
  }
}
