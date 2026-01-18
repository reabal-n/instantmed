import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getIntakeMonitoringStats, getSlaBreachIntakes } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
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
