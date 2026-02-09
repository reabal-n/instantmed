import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("assign-intake")

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const supabase = createServiceRoleClient()
    const { userId: clerkUserId } = await auth()
    userId = clerkUserId ?? null

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { intake_id, doctor_id } = await request.json()

    if (!intake_id || !doctor_id) {
      return NextResponse.json({ error: "intake_id and doctor_id required" }, { status: 400 })
    }

    // SECURITY: Validate that doctor_id is an actual doctor profile
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", doctor_id)
      .single()

    if (!doctorProfile || (doctorProfile.role !== "doctor" && doctorProfile.role !== "admin")) {
      return NextResponse.json({ error: "Invalid doctor_id — must be a doctor or admin" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("intakes")
      .update({
        doctor_id,
        status: "in_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id)
      .select()
      .single()

    if (error) {
      log.error("Failed to assign intake", { intake_id, error: error.message })
      return NextResponse.json({ error: "Failed to assign request" }, { status: 500 })
    }

    return NextResponse.json({ success: true, intake: data })
  } catch (error) {
    log.error("Assign intake failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
