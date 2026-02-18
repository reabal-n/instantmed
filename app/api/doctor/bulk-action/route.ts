import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { refundIfEligible } from "@/lib/stripe/refunds"
import { logTriageApproved, logTriageDeclined } from "@/lib/audit/compliance-audit"
import type { RequestType } from "@/lib/audit/compliance-audit"
import { requireValidCsrf } from "@/lib/security/csrf"

const log = createLogger("bulk-action")

// Valid statuses that can be transitioned from
const ACTIONABLE_STATUSES = ["paid", "awaiting_review", "in_review", "pending_info"]

// Map category to RequestType
function getRequestType(category: string | null): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription") return "repeat_rx"
  return "intake"
}

interface BulkActionResult {
  id: string
  success: boolean
  error?: string
  previousStatus?: string
  refundResult?: {
    refunded: boolean
    reason: string
  }
}

export async function POST(request: NextRequest) {
  let clerkUserId: string | null = null

  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

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

    const { intake_ids, action, notes, doctor_id } = await request.json()

    if (!intake_ids || !Array.isArray(intake_ids) || intake_ids.length === 0) {
      return NextResponse.json({ error: "Invalid intake_ids" }, { status: 400 })
    }

    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Limit bulk operations to prevent abuse
    if (intake_ids.length > 50) {
      return NextResponse.json({ error: "Maximum 50 intakes per bulk action" }, { status: 400 })
    }

    const timestamp = new Date().toISOString()
    const results: BulkActionResult[] = []

    // Process each intake with proper validation
    for (const id of intake_ids) {
      try {
        // STEP 1: Fetch current intake status (prevents race conditions)
        const { data: intake, error: fetchError } = await supabase
          .from("intakes")
          .select("id, status, patient_id, category")
          .eq("id", id)
          .single()

        if (fetchError || !intake) {
          results.push({ id, success: false, error: "Intake not found" })
          continue
        }

        // STEP 2: Check if already processed (idempotency)
        if (intake.status === "approved" || intake.status === "declined" || intake.status === "completed") {
          results.push({
            id,
            success: false,
            error: `Intake already ${intake.status}`,
            previousStatus: intake.status,
          })
          continue
        }

        // STEP 3: Validate status can be transitioned
        if (!ACTIONABLE_STATUSES.includes(intake.status)) {
          results.push({
            id,
            success: false,
            error: `Cannot ${action} intake with status '${intake.status}'`,
            previousStatus: intake.status,
          })
          continue
        }

        // STEP 3.5: BLOCK bulk approval for med certs - they MUST go through document builder
        // Med certs require PDF generation and email sending which can't be done in bulk
        if (action === "approve" && (intake.category === "medical_certificate" || intake.category === "med_certs")) {
          results.push({
            id,
            success: false,
            error: "Medical certificates cannot be bulk approved. Use the document builder to generate PDFs individually.",
            previousStatus: intake.status,
          })
          continue
        }

        // STEP 4: Perform atomic update with status check
        const newStatus = action === "approve" ? "approved" : "declined"
        const { data: updated, error: updateError } = await supabase
          .from("intakes")
          .update({
            status: newStatus,
            doctor_notes: notes,
            reviewing_doctor_id: doctor_id || profile.id,
            reviewed_by: profile.id,
            reviewed_at: timestamp,
            updated_at: timestamp,
          })
          .eq("id", id)
          .in("status", ACTIONABLE_STATUSES) // Only update if still actionable
          .select("id, status")
          .single()

        if (updateError || !updated) {
          results.push({
            id,
            success: false,
            error: "Update failed - status may have changed",
            previousStatus: intake.status,
          })
          continue
        }

        // STEP 5: Log compliance event
        const requestType = getRequestType(intake.category)
        const auditMetadata = {
          previousStatus: intake.status,
          newStatus,
          bulkAction: true,
          notes: notes ? notes.substring(0, 200) : undefined,
        }

        if (action === "approve") {
          await logTriageApproved(id, requestType, profile.id, auditMetadata).catch((err) => {
            log.warn("Failed to log compliance event", { intakeId: id }, err)
          })
        } else {
          await logTriageDeclined(id, requestType, profile.id, notes || "Declined via bulk action").catch((err) => {
            log.warn("Failed to log compliance event", { intakeId: id }, err)
          })
        }

        // STEP 6: Process refund for declines
        let refundResult = null
        if (action === "decline") {
          try {
            refundResult = await refundIfEligible(id, clerkUserId)
          } catch (refundError) {
            log.error("Refund processing failed in bulk action", { intakeId: id }, refundError)
            refundResult = { refunded: false, reason: "Refund processing error" }
          }
        }

        results.push({
          id,
          success: true,
          previousStatus: intake.status,
          refundResult: refundResult ? {
            refunded: refundResult.refunded,
            reason: refundResult.reason,
          } : undefined,
        })

      } catch (itemError) {
        log.error("Error processing intake in bulk action", { intakeId: id }, itemError)
        results.push({ id, success: false, error: "Processing error" })
      }
    }

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success)

    log.info("Bulk action completed", {
      action,
      total: intake_ids.length,
      successful,
      failed: failed.length,
      actorId: profile.id,
    })

    return NextResponse.json({
      success: true,
      updated: successful,
      failed: failed.length,
      results,
    })
  } catch (error) {
    log.error("Bulk action failed", { clerkUserId }, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
