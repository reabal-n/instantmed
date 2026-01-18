import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDoctorPersonalStats } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await getDoctorPersonalStats(profile.id)
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch personal stats" },
      { status: 500 }
    )
  }
}
