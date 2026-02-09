import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { refundIfEligible } from "@/lib/stripe/refunds"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("update-intake")

export async function POST(request: NextRequest) {
  let clerkUserId: string | null = null

  try {
    // Apply rate limiting for sensitive operations
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const { userId } = await auth()
    clerkUserId = userId

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { intake_id, action, notes, doctor_id } = await request.json()

    if (!intake_id) {
      return NextResponse.json({ error: "intake_id required" }, { status: 400 })
    }

    if (!action || !["approve", "decline", "pending_info"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // SECURITY: Validate doctor_id if provided
    if (doctor_id) {
      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", doctor_id)
        .single()

      if (!doctorProfile || (doctorProfile.role !== "doctor" && doctorProfile.role !== "admin")) {
        return NextResponse.json({ error: "Invalid doctor_id" }, { status: 400 })
      }
    }

    const statusMap = {
      approve: "approved",
      decline: "declined",
      pending_info: "pending_info",
    }

    const { data, error } = await supabase
      .from("intakes")
      .update({
        status: statusMap[action as keyof typeof statusMap],
        doctor_notes: notes,
        doctor_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id)
      .select()
      .single()

    if (error) {
      log.error("Failed to update intake", { intake_id, error: error.message })
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
    }

    // Process refund for declined intakes
    if (action === "decline") {
      try {
        const refundResult = await refundIfEligible(intake_id, clerkUserId!)
        log.info("Refund processing completed", { 
          intakeId: intake_id, 
          refunded: refundResult.refunded,
          refundStatus: refundResult.refundStatus,
        })
      } catch (refundError) {
        // Log but don't fail the decline - refund can be processed manually
        log.error("Refund processing failed", { intakeId: intake_id }, refundError)
      }
    }

    return NextResponse.json({ success: true, intake: data })
  } catch (error) {
    log.error("Update intake failed", { clerkUserId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
