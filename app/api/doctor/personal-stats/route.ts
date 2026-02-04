import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getDoctorPersonalStats } from "@/lib/data/intakes"
import { applyRateLimit } from "@/lib/rate-limit/redis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    // Require doctor or admin role
    const { profile } = await requireRole(["doctor", "admin"])

    const stats = await getDoctorPersonalStats(profile.id)
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch personal stats" },
      { status: 500 }
    )
  }
}
