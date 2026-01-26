import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getDoctorPersonalStats } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
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
