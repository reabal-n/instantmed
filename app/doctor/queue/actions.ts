"use server"

import { revalidatePath } from "next/cache"
import {
  updateIntakeStatus,
  saveDoctorNotes,
  flagForFollowup,
  markAsReviewed,
  declineIntake,
  updateScriptSent,
  createPatientNote,
} from "@/lib/data/intakes"
import { requireAuth } from "@/lib/auth"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import type { IntakeStatus } from "@/types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function updateStatusAction(
  intakeId: string,
  status: IntakeStatus,
  _doctorId: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await updateIntakeStatus(intakeId, status, profile.id)
    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // Mark as reviewed if going to in_review
    if (status === "in_review") {
      await markAsReviewed(intakeId, profile.id)
    }

    revalidatePath("/doctor")
    revalidatePath("/doctor/queue")
    revalidatePath(`/doctor/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof IntakeLifecycleError) {
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
            error: "This intake has already been finalized",
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
  intakeId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await saveDoctorNotes(intakeId, notes)
  if (!success) {
    return { success: false, error: "Failed to save notes" }
  }

  return { success: true }
}

export async function declineIntakeAction(
  intakeId: string,
  reasonCode: string,
  reasonNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await declineIntake(intakeId, profile.id, reasonCode, reasonNote)
  if (!success) {
    return { success: false, error: "Failed to decline" }
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/intakes/${intakeId}`)

  return { success: true }
}

export async function flagForFollowupAction(
  intakeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await flagForFollowup(intakeId, reason)
  if (!success) {
    return { success: false, error: "Failed to flag" }
  }

  return { success: true }
}

export async function markScriptSentAction(
  intakeId: string,
  scriptNotes?: string,
  parchmentReference?: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await updateScriptSent(intakeId, true, scriptNotes, parchmentReference)
  if (!success) {
    return { success: false, error: "Failed to mark script sent" }
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/intakes/${intakeId}`)

  return { success: true }
}

export async function addPatientNoteAction(
  patientId: string,
  content: string,
  options?: {
    intakeId?: string
    noteType?: string
    title?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const note = await createPatientNote(patientId, profile.id, content, options)
  if (!note) {
    return { success: false, error: "Failed to create note" }
  }

  return { success: true }
}
