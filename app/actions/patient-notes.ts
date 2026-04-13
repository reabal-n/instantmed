"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("patient-notes")

interface PatientNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by: string
  created_by_name: string | null
}

interface AddNoteResult {
  success: boolean
  error?: string
  note?: PatientNote
}

/**
 * Add a note to a patient's profile.
 * Only doctors and admins can add notes.
 */
export async function addPatientNoteAction(
  patientId: string,
  content: string,
  noteType: string = "general"
): Promise<AddNoteResult> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("patient_notes")
      .insert({
        patient_id: patientId,
        content,
        note_type: noteType,
        created_by: profile.id,
        created_by_name: profile.full_name,
      })
      .select("id, patient_id, note_type, content, created_by, created_by_name, created_at, updated_at")
      .single()

    if (error) {
      log.error("Failed to add patient note", { patientId, error })
      return { success: false, error: "Failed to add note" }
    }

    revalidatePath("/doctor")
    log.info("Patient note added", { patientId, noteId: data.id, by: profile.id })
    return { success: true, note: data as PatientNote }
  } catch (error) {
    log.error("Add patient note error", { 
      patientId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    return { success: false, error: "Failed to add note" }
  }
}

/**
 * Get all notes for a patient.
 */
export async function getPatientNotesAction(patientId: string): Promise<{ notes: PatientNote[] }> {
  try {
    await requireRole(["doctor", "admin"])
    
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("patient_notes")
      .select("id, content, note_type, created_at, created_by, created_by_name")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    if (error) {
      log.error("Failed to get patient notes", { patientId, error })
      return { notes: [] }
    }

    return { notes: data as PatientNote[] }
  } catch {
    return { notes: [] }
  }
}

/**
 * Delete a patient note.
 */
export async function deletePatientNoteAction(noteId: string): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("patient_notes")
      .delete()
      .eq("id", noteId)

    if (error) {
      log.error("Failed to delete patient note", { noteId, error })
      return { success: false }
    }

    revalidatePath("/doctor")
    log.info("Patient note deleted", { noteId, by: profile.id })
    return { success: true }
  } catch {
    return { success: false }
  }
}
