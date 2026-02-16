import { NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { getIntakeMonitoringStats, getSlaBreachIntakes } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch stats and SLA data in parallel
    const [stats, slaData] = await Promise.all([
      getIntakeMonitoringStats(),
      getSlaBreachIntakes(),
    ])

    return NextResponse.json({
      ...stats,
      slaBreached: slaData.breached,
      slaApproaching: slaData.approaching,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch monitoring stats" },
      { status: 500 }
    )
  }
}
