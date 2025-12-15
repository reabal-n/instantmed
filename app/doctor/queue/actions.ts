"use server"

import { revalidatePath } from "next/cache"
import {
  updateRequestStatus,
  saveDoctorNotes,
  escalateRequest,
  flagForFollowup,
  markAsReviewed,
} from "@/lib/data/requests"
import { requireAuth } from "@/lib/auth"
import { RequestLifecycleError } from "../../../lib/data/request-lifecycle"
import type { RequestStatus } from "@/types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function updateStatusAction(
  requestId: string,
  status: RequestStatus,
  doctorId: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  // Validate input
  if (!isValidUUID(requestId)) {
    console.error("[queue/updateStatusAction] Invalid requestId:", requestId)
    return { success: false, error: "Invalid request ID" }
  }

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // This will throw RequestLifecycleError if transition is invalid
    const result = await updateRequestStatus(requestId, status, profile.id)
    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // Mark as reviewed
    await markAsReviewed(requestId, doctorId)

    console.log("[queue/updateStatusAction] Status updated:", {
      requestId,
      status,
      doctorId: profile.id,
    })

    revalidatePath("/doctor")
    revalidatePath("/doctor/queue")
    revalidatePath(`/doctor/requests/${requestId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof RequestLifecycleError) {
      console.error("[queue/updateStatusAction] Lifecycle error:", {
        requestId,
        attemptedStatus: status,
        code: error.code,
        message: error.message,
      })

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
            error: "This request has already been finalized",
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
    throw error
  }
}

export async function saveDoctorNotesAction(
  requestId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await saveDoctorNotes(requestId, notes)
  if (!success) {
    return { success: false, error: "Failed to save notes" }
  }

  return { success: true }
}

export async function escalateRequestAction(
  requestId: string,
  level: "senior_review" | "phone_consult",
  reason: string,
  doctorId: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await escalateRequest(requestId, level, reason, doctorId)
  if (!success) {
    return { success: false, error: "Failed to escalate" }
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")

  return { success: true }
}

export async function flagForFollowupAction(
  requestId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await flagForFollowup(requestId, reason)
  if (!success) {
    return { success: false, error: "Failed to flag" }
  }

  return { success: true }
}
