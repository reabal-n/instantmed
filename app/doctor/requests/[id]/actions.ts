"use server"

import { revalidatePath } from "next/cache"
import { updateRequestStatus, updateClinicalNote } from "@/lib/data/requests"
import { requireAuth } from "@/lib/auth"
import type { RequestStatus } from "@/types/db"

export async function updateStatusAction(
  requestId: string,
  status: RequestStatus,
): Promise<{ success: boolean; error?: string }> {
  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await updateRequestStatus(requestId, status)

  if (!result) {
    return { success: false, error: "Failed to update status" }
  }

  revalidatePath("/doctor")
  revalidatePath(`/doctor/requests/${requestId}`)

  return { success: true }
}

export async function saveClinicalNoteAction(
  requestId: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
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
