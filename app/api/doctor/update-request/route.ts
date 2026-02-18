import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { refundIfEligible } from "@/lib/stripe/refunds"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const log = createLogger("update-intake")

export async function POST(request: NextRequest) {
  let clerkUserId: string | null = null

  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

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
      .select("id, role")
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

    // SECURITY: Verify intake exists and doctor has ownership (assigned to them or unclaimed)
    const { data: currentIntake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, reviewing_doctor_id, payment_status")
      .eq("id", intake_id)
      .single()

    if (fetchError || !currentIntake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 })
    }

    // Only allow updates if intake is assigned to this doctor, or unclaimed (for admins)
    const isAssignedDoctor = currentIntake.reviewing_doctor_id === profile.id
    const isUnclaimedForAdmin = !currentIntake.reviewing_doctor_id && profile.role === "admin"
    if (!isAssignedDoctor && !isUnclaimedForAdmin && profile.role !== "admin") {
      log.warn("Doctor attempted to update intake assigned to another doctor", {
        intake_id,
        requestingDoctorId: profile.id,
        assignedDoctorId: currentIntake.reviewing_doctor_id,
      })
      return NextResponse.json({ error: "This intake is assigned to another doctor" }, { status: 403 })
    }

    // Validate status can be transitioned
    const actionableStatuses = ["paid", "in_review", "pending_info", "escalated"]
    if (!actionableStatuses.includes(currentIntake.status)) {
      return NextResponse.json({
        error: `Cannot ${action} intake with status '${currentIntake.status}'`
      }, { status: 400 })
    }

    // SECURITY: Validate doctor_id if provided
    const effectiveDoctorId = doctor_id || profile.id
    if (doctor_id && doctor_id !== profile.id) {
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
        reviewing_doctor_id: effectiveDoctorId,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id)
      .in("status", actionableStatuses) // Prevent race conditions
      .select("id, status, updated_at")
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
