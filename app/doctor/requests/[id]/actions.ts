"use server"

import { revalidatePath } from "next/cache"
import { updateRequestStatus, updateClinicalNote } from "@/lib/data/requests"
import { requireAuth } from "@/lib/auth"
import { RequestLifecycleError } from "../../../../lib/data/request-lifecycle"
import { refundIfEligible, type RefundResult } from "@/lib/stripe/refunds"
import type { RequestStatus } from "@/types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function updateStatusAction(
  requestId: string,
  status: RequestStatus,
): Promise<{ success: boolean; error?: string; code?: string; refund?: RefundResult }> {
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
    // Pass doctor's profile ID for audit trail
    // This will throw RequestLifecycleError if transition is invalid
    const result = await updateRequestStatus(requestId, status, profile.id)

    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

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
