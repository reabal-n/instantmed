import { NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { hasStaffAccess } from "@/lib/auth/staff-capabilities"
import { EMPTY_SYSTEM_HEALTH, getSystemHealth } from "@/lib/data/system-health"
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
    log.warn("Failed to load system health", {}, error)
    return NextResponse.json(EMPTY_SYSTEM_HEALTH)
  }
}
