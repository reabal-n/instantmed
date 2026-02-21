import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendPaymentReceivedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const log = createLogger("resend-confirmation")

/**
 * P0 FIX: Fallback endpoint to resend payment confirmation email
 * Called from success page if user hasn't received confirmation within expected time
 * Rate limited to prevent abuse
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { intakeId } = body

    if (!intakeId || typeof intakeId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing intake ID" },
        { status: 400 }
      )
    }

    // Rate limit by intake ID to prevent spam
    const rateLimitResponse = await applyRateLimit(request, "sensitive", `resend-confirmation:${intakeId}`)
    if (rateLimitResponse) {
      return NextResponse.json(
        { success: false, error: "Please wait before requesting another email" },
        { status: 429 }
      )
    }

    // Require authentication — only the intake owner should resend
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = createServiceRoleClient()

    // Fetch intake with patient and service info
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        payment_status,
        amount_cents,
        confirmation_email_sent_at,
        category,
        patient:profiles!patient_id(id, email, first_name)
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      log.warn("Intake not found for resend", { intakeId })
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Verify the authenticated user owns this intake
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single()

    const patientData = intake.patient
    const patient = Array.isArray(patientData) ? patientData[0] : patientData

    if (!callerProfile || !patient || patient.id !== callerProfile.id) {
      log.warn("User attempted to resend confirmation for intake they don't own", { intakeId, clerkUserId })
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    // Only resend for paid intakes
    if (intake.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, error: "Payment not yet confirmed" },
        { status: 400 }
      )
    }

    const service = { name: intake.category || "Service" }

    if (!patient?.email) {
      return NextResponse.json(
        { success: false, error: "No email address on file" },
        { status: 400 }
      )
    }

    // Check if confirmation was already sent recently (within last 5 minutes)
    if (intake.confirmation_email_sent_at) {
      const sentAt = new Date(intake.confirmation_email_sent_at)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      if (sentAt > fiveMinutesAgo) {
        return NextResponse.json({
          success: true,
          message: "Confirmation email was recently sent. Please check your inbox and spam folder.",
          alreadySent: true,
        })
      }
    }

    // Send the confirmation email
    const amount = intake.amount_cents 
      ? `$${(intake.amount_cents / 100).toFixed(2)}`
      : "N/A"

    const result = await sendPaymentReceivedEmail({
      to: patient.email,
      patientName: patient.first_name || "there",
      amount,
      serviceName: service?.name || "your request",
      intakeId: intake.id,
      patientId: patient.id,
    })

    if (result.success) {
      // Update confirmation_email_sent_at
      await supabase
        .from("intakes")
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq("id", intakeId)

      log.info("Resent confirmation email", { intakeId, email: patient.email })
      return NextResponse.json({
        success: true,
        message: "Confirmation email sent. Please check your inbox.",
      })
    } else {
      log.error("Failed to resend confirmation email", { intakeId, error: result.error })
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again." },
        { status: 500 }
      )
    }
  } catch (error) {
    log.error("Resend confirmation error", {}, error)
    return NextResponse.json(
      { success: false, error: "We couldn't resend the confirmation. Please try again." },
      { status: 500 }
    )
  }
}
