import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { getDoctorPersonalStats } from "@/lib/data/intakes"
import { applyRateLimit } from "@/lib/rate-limit/redis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    const stats = await getDoctorPersonalStats(profile.id)
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch personal stats" },
      { status: 500 }
    )
  }
}
