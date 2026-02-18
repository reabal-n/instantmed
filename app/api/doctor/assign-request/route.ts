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

    // Use claim RPC for consistent assignment (prevents race conditions)
    const { data: claimResult, error: claimError } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intake_id,
      p_doctor_id: doctor_id,
      p_force: true, // Admin/manual assignment overrides existing claims
    })

    const claim = Array.isArray(claimResult) ? claimResult[0] : claimResult
    if (claimError || !claim?.success) {
      log.warn("Cannot assign intake via claim RPC", { intake_id, error: claim?.error_message || claimError?.message })
      return NextResponse.json({
        error: claim?.error_message || "This intake cannot be assigned. It may have already been claimed or is not in the queue."
      }, { status: 409 })
    }

    return NextResponse.json({ success: true, intake: { id: intake_id } })
  } catch (error) {
    log.error("Assign intake failed", { userId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
