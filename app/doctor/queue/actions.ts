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
import type { RequestStatus } from "@/types/db"

export async function updateStatusAction(
  requestId: string,
  status: RequestStatus,
  doctorId: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await updateRequestStatus(requestId, status)
  if (!result) {
    return { success: false, error: "Failed to update status" }
  }

  // Mark as reviewed
  await markAsReviewed(requestId, doctorId)

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/requests/${requestId}`)

  return { success: true }
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
