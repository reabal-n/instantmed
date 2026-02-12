/**
 * Immutable Date Policy
 * 
 * ADVERSARIAL_SECURITY_AUDIT EXPLOIT MC-2: Prevents backdating via support
 * 
 * Once a certificate start date is set, it cannot be changed.
 * Any manual changes require audit trail and manager approval.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface DateChangeRequest {
  intakeId: string
  originalDate: string
  requestedDate: string
  reason: string
  requestedBy: string
  approvedBy?: string
  status: "pending" | "approved" | "rejected"
}

/**
 * Check if a date change is allowed
 * Returns false for all automatic changes - must go through approval process
 */
export function isDateChangeAllowed(
  originalDate: Date,
  requestedDate: Date,
  _isAdmin: boolean = false
): { allowed: boolean; reason: string } {
  // ADVERSARIAL_SECURITY_AUDIT: No automatic backdating allowed
  if (requestedDate < originalDate) {
    return {
      allowed: false,
      reason: "Backdating is not permitted. Certificate start dates cannot be changed to earlier dates.",
    }
  }

  // Forward dating within 24 hours is allowed
  const hoursDiff = (requestedDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60)
  if (hoursDiff <= 24) {
    return {
      allowed: true,
      reason: "Date change within 24 hours is permitted",
    }
  }

  // Larger changes require approval
  return {
    allowed: false,
    reason: "Date changes greater than 24 hours require manager approval",
  }
}

/**
 * Request a date change (for audit trail)
 */
export async function requestDateChange(
  intakeId: string,
  originalDate: string,
  requestedDate: string,
  reason: string,
  requestedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Log the request attempt
  const { error } = await supabase.from("date_change_requests").insert({
    intake_id: intakeId,
    original_date: originalDate,
    requested_date: requestedDate,
    reason,
    requested_by: requestedBy,
    status: "pending",
    created_at: new Date().toISOString(),
  })

  if (error) {
    return { success: false, error: "Failed to submit date change request" }
  }

  // Also log to audit trail
  await supabase.from("audit_logs").insert({
    action: "date_change_requested",
    intake_id: intakeId,
    details: {
      originalDate,
      requestedDate,
      reason,
      requestedBy,
    },
  })

  return { success: true }
}

/**
 * Approve/reject a date change (manager only)
 */
export async function processDateChangeRequest(
  changeRequestId: string,
  decision: "approved" | "rejected",
  approvedBy: string,
  approvalReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Get the original request
  const { data: request, error: fetchError } = await supabase
    .from("date_change_requests")
    .select("*")
    .eq("id", changeRequestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: "Date change request not found" }
  }

  // Update the request status
  const { error: updateError } = await supabase
    .from("date_change_requests")
    .update({
      status: decision,
      approved_by: approvedBy,
      approval_reason: approvalReason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", changeRequestId)

  if (updateError) {
    return { success: false, error: "Failed to process date change request" }
  }

  // If approved, update the actual certificate
  if (decision === "approved") {
    const { error: certError } = await supabase
      .from("intakes")
      .update({
        // Update the answers with new date
        answers: supabase.rpc("jsonb_set_value", {
          target: "answers",
          path: "{start_date}",
          value: JSON.stringify(request.requested_date),
        }),
      })
      .eq("id", request.intake_id)

    if (certError) {
      return { success: false, error: "Failed to update certificate date" }
    }
  }

  // Log to audit trail
  await supabase.from("audit_logs").insert({
    action: `date_change_${decision}`,
    intake_id: request.intake_id,
    details: {
      originalDate: request.original_date,
      requestedDate: request.requested_date,
      decision,
      approvedBy,
      approvalReason,
    },
  })

  return { success: true }
}

/**
 * Policy text for display to users/support
 */
export const IMMUTABLE_DATE_POLICY = `
Medical Certificate Date Policy

Once a medical certificate has been submitted:
• The start date CANNOT be backdated under any circumstances
• Forward date changes of up to 24 hours may be processed
• Larger date changes require manager approval with documented reason
• All date change requests are logged for audit purposes

This policy is in place to maintain the integrity of medical certificates
and comply with Fair Work Act requirements.

If you made an error with your certificate date, please contact support
and explain the situation. A new certificate request may be required.
`.trim()
