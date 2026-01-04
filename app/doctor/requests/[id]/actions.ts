"use server"

import { revalidatePath } from "next/cache"
import { updateRequestStatus, updateClinicalNote } from "@/lib/data/requests"
import { requireAuth } from "@/lib/auth"
import { RequestLifecycleError } from "../../../../lib/data/request-lifecycle"
import { refundIfEligible, type RefundResult } from "@/lib/stripe/refunds"
import type { RequestStatus, DeclineReasonCode } from "@/types/db"
import { logAuditEvent } from "@/lib/security/audit-log"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

import { getAppUrl, getInternalApiSecret } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("actions")

// Trigger email sending via internal API (avoids react-dom/server import in server action)
async function triggerStatusEmail(
  requestId: string, 
  status: RequestStatus, 
  doctorName: string,
  declineReason?: string
): Promise<void> {
  try {
    const baseUrl = getAppUrl()
    await fetch(`${baseUrl}/api/internal/send-status-email`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-internal-secret": getInternalApiSecret(),
      },
      body: JSON.stringify({ requestId, status, doctorName, declineReason }),
    })
  } catch (error) {
    // Log but don't fail the status update if email fails
    log.error("Failed to trigger status email", { error, requestId, status })
  }
}

export interface DeclineData {
  reasonCode: DeclineReasonCode
  reasonNote: string  // Message to patient
}

export async function updateStatusAction(
  requestId: string,
  status: RequestStatus,
  declineData?: DeclineData,
): Promise<{ success: boolean; error?: string; code?: string; refund?: RefundResult }> {
  // Validate input
  if (!isValidUUID(requestId)) {
    return { success: false, error: "Invalid request ID" }
  }

  // Validate decline data if declining
  if (status === "declined") {
    if (!declineData?.reasonCode) {
      return { success: false, error: "Decline reason code is required" }
    }
    if (!declineData?.reasonNote?.trim()) {
      return { success: false, error: "Decline message to patient is required" }
    }
  }

  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Pass doctor's profile ID for audit trail
    // This will throw RequestLifecycleError if transition is invalid
    const result = await updateRequestStatus(requestId, status, profile.id)

    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // If declining, update the decline fields
    if (status === "declined" && declineData) {
      const { createClient: createServiceClient } = await import("@supabase/supabase-js")
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && serviceKey) {
        const supabase = createServiceClient(supabaseUrl, serviceKey)
        await supabase
          .from("requests")
          .update({
            decision: "declined",
            decline_reason_code: declineData.reasonCode,
            decline_reason_note: declineData.reasonNote,
            decided_at: new Date().toISOString(),
          })
          .eq("id", requestId)
      }

      // Log audit event for decline
      await logAuditEvent({
        action: "request_declined",
        actorId: profile.id,
        actorType: "doctor",
        requestId,
        fromState: result.status || "pending",
        toState: "declined",
        metadata: {
          decline_reason_code: declineData.reasonCode,
          doctor_name: profile.full_name,
        },
      })
    }

    // Trigger email notification asynchronously (non-blocking)
    triggerStatusEmail(requestId, status, profile.full_name || "Your Doctor", declineData?.reasonNote)

    // If declined, process refund if eligible
    let refundResult: RefundResult | undefined
    if (status === "declined") {
      try {
        refundResult = await refundIfEligible(requestId, profile.id)
      } catch (refundError) {
        // Don't fail the decline - refund is secondary
        refundResult = {
          success: false,
          refunded: false,
          refundStatus: "failed",
          reason: "Unexpected error during refund processing",
          error: refundError instanceof Error ? refundError.message : "Unknown error",
        }
      }
    }

    revalidatePath("/doctor")
    revalidatePath(`/doctor/requests/${requestId}`)

    return { success: true, refund: refundResult }
  } catch (error) {
    // Handle lifecycle errors with specific messages
    if (error instanceof RequestLifecycleError) {
      // Return user-friendly error messages
      switch (error.code) {
        case "PAYMENT_REQUIRED":
          return {
            success: false,
            error: "Cannot update status - payment not completed",
            code: error.code,
          }
        case "TERMINAL_STATE":
          return {
            success: false,
            error: "This request has already been finalized and cannot be changed",
            code: error.code,
          }
        case "INVALID_TRANSITION":
          return {
            success: false,
            error: `Invalid status change. ${error.message}`,
            code: error.code,
          }
        default:
          return {
            success: false,
            error: error.message,
            code: error.code,
          }
      }
    }

    // Re-throw unexpected errors
    throw error
  }
}

export async function saveClinicalNoteAction(
  requestId: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  if (!isValidUUID(requestId)) {
    return { success: false, error: "Invalid request ID" }
  }

  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await updateClinicalNote(requestId, note)

  if (!success) {
    return { success: false, error: "Failed to save note" }
  }

  revalidatePath(`/doctor/requests/${requestId}`)

  return { success: true }
}
/**
 * Mark a prescription request as eScript sent
 * Sets status to "approved", records parchment reference, and triggers email
 */
export async function markEScriptSentAction(
  requestId: string,
  parchmentReference: string | null,
  sentVia: "parchment" | "paper"
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  if (!isValidUUID(requestId)) {
    return { success: false, error: "Invalid request ID" }
  }

  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: "Server configuration error" }
    }
    const supabase = createServiceClient(supabaseUrl, serviceKey)

    // Verify request exists and is in awaiting_prescribe status
    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status, category, patient_id")
      .eq("id", requestId)
      .single()

    if (fetchError || !request) {
      return { success: false, error: "Request not found" }
    }

    if (request.status !== "awaiting_prescribe") {
      return { success: false, error: `Request is not awaiting prescription. Current status: ${request.status}` }
    }

    if (request.category !== "prescription") {
      return { success: false, error: "This action is only available for prescription requests" }
    }

    // Update request to approved with eScript details
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: "approved",
        script_sent: true,
        script_sent_at: new Date().toISOString(),
        parchment_reference: parchmentReference,
        sent_via: sentVia,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    if (updateError) {
      log.error("Failed to mark eScript sent", { error: updateError, requestId })
      return { success: false, error: "Failed to update request" }
    }

    // Log audit entry
    const { logAuditEvent } = await import("@/lib/security/audit-log")
    await logAuditEvent({
      action: "request_approved",
      actorId: profile.id,
      actorType: "doctor",
      requestId,
      fromState: "awaiting_prescribe",
      toState: "approved",
      metadata: {
        parchment_reference: parchmentReference,
        sent_via: sentVia,
        doctor_name: profile.full_name,
      },
    })

    // Trigger email notification (now that status is approved/completed)
    triggerStatusEmail(requestId, "approved", profile.full_name || "Your Doctor")

    revalidatePath("/doctor")
    revalidatePath(`/doctor/requests/${requestId}`)

    return { success: true }
  } catch (error) {
    log.error("Error marking eScript sent", { error, requestId })
    return { success: false, error: "An unexpected error occurred" }
  }
}