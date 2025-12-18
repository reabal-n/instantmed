"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"

interface AmendRequestResult {
  success: boolean
  error?: string
  message?: string
}

interface AmendmentData {
  additionalNotes?: string
  updatedAnswers?: Record<string, unknown>
}

export async function submitRequestAmendmentAction(
  requestId: string,
  amendment: AmendmentData
): Promise<AmendRequestResult> {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in to amend a request" }
    }

    const supabase = createServiceRoleClient()

    // Fetch the request with ownership check
    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("*, request_answers(*)")
      .eq("id", requestId)
      .eq("patient_id", authUser.profile.id)
      .single()

    if (fetchError || !request) {
      return { success: false, error: "Request not found" }
    }

    // Only allow amendments for pending requests (not yet reviewed)
    if (request.status !== "pending") {
      return {
        success: false,
        error: "This request has already been reviewed and cannot be amended",
      }
    }

    // Don't allow amendments if payment is pending
    if (request.payment_status === "pending_payment") {
      return {
        success: false,
        error: "Please complete payment before amending your request",
      }
    }

    // Get existing answers
    const existingAnswers = request.request_answers?.[0]?.answers || {}

    // Merge amendments with existing answers
    const updatedAnswers = {
      ...existingAnswers,
      ...(amendment.updatedAnswers || {}),
      _amendment: {
        timestamp: new Date().toISOString(),
        previousNotes: existingAnswers.additionalNotes || "",
        newNotes: amendment.additionalNotes || "",
      },
    }

    // Add additional notes if provided
    if (amendment.additionalNotes) {
      const existingNotes = existingAnswers.additionalNotes || ""
      updatedAnswers.additionalNotes = existingNotes
        ? `${existingNotes}\n\n[Amendment ${new Date().toLocaleDateString()}]: ${amendment.additionalNotes}`
        : amendment.additionalNotes
    }

    // Update the request answers
    const { error: updateError } = await supabase
      .from("request_answers")
      .update({ answers: updatedAnswers, updated_at: new Date().toISOString() })
      .eq("request_id", requestId)

    if (updateError) {
      console.error("[AmendRequest] Error updating answers:", updateError)
      return { success: false, error: "Failed to update your request. Please try again." }
    }

    // Log the amendment in request metadata
    const { error: requestUpdateError } = await supabase
      .from("requests")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...((request.metadata as Record<string, unknown>) || {}),
          lastAmendment: new Date().toISOString(),
          amendmentCount: ((request.metadata as Record<string, unknown>)?.amendmentCount as number || 0) + 1,
        },
      })
      .eq("id", requestId)

    if (requestUpdateError) {
      console.error("[AmendRequest] Error updating request metadata:", requestUpdateError)
      // Don't fail - the main update succeeded
    }

    revalidatePath(`/patient/requests/${requestId}`)
    revalidatePath("/patient/requests")

    return {
      success: true,
      message: "Your request has been updated. The doctor will see your changes.",
    }
  } catch (error) {
    console.error("[AmendRequest] Unexpected error:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function canAmendRequestAction(requestId: string): Promise<{
  canAmend: boolean
  reason?: string
}> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { canAmend: false, reason: "Not authenticated" }
    }

    const supabase = createServiceRoleClient()
    const { data: request } = await supabase
      .from("requests")
      .select("status, payment_status")
      .eq("id", requestId)
      .eq("patient_id", authUser.profile.id)
      .single()

    if (!request) {
      return { canAmend: false, reason: "Request not found" }
    }

    if (request.status !== "pending") {
      return { canAmend: false, reason: "Request already reviewed" }
    }

    if (request.payment_status === "pending_payment") {
      return { canAmend: false, reason: "Payment required first" }
    }

    return { canAmend: true }
  } catch {
    return { canAmend: false, reason: "Error checking status" }
  }
}
