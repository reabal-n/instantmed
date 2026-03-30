import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireApiRole } from "@/lib/auth"
import { getIntakeMonitoringStats, getSlaBreachIntakes, getAutoApprovalMetrics } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    // Require doctor or admin role (defense-in-depth)
    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch stats, SLA data, and auto-approval metrics in parallel
    const [stats, slaData, autoApprovalMetrics] = await Promise.all([
      getIntakeMonitoringStats(),
      getSlaBreachIntakes(),
      getAutoApprovalMetrics(),
    ])

    return NextResponse.json({
      ...stats,
      slaBreached: slaData.breached,
      slaApproaching: slaData.approaching,
      aiApprovedToday: autoApprovalMetrics?.todayApproved,
      aiRevokedToday: autoApprovalMetrics?.todayRevoked,
      aiAttemptedToday: autoApprovalMetrics?.todayAttempted,
      aiIneligibleToday: autoApprovalMetrics?.todayIneligible,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch monitoring stats" },
      { status: 500 }
    )
  }
}
