import { NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { EMPTY_STAFF_NAV_COUNTS } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("staff-nav-counts-api")

export const dynamic = "force-dynamic"

export async function GET() {
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const counts = await getStaffNavCounts()
    return NextResponse.json(counts)
  } catch (error) {
    log.warn("Failed to load staff nav counts", {}, error)
    return NextResponse.json(EMPTY_STAFF_NAV_COUNTS)
  }
}
