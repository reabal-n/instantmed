import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { upsertHealthProfile } from "@/lib/data/health-profile"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("patient-health-profile")

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const success = await upsertHealthProfile(profile.id, {
      allergies: body.allergies || [],
      conditions: body.conditions || [],
      current_medications: body.current_medications || [],
      blood_type: body.blood_type,
      emergency_contact_name: body.emergency_contact_name,
      emergency_contact_phone: body.emergency_contact_phone,
      notes: body.notes,
    })

    if (!success) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Health profile update failed", {
      error: error instanceof Error ? error.message : "Unknown",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
