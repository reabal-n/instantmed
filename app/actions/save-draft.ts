"use server"

import { createClient } from "@/lib/supabase/server"

// Type for draft data - using unknown for type safety
type DraftData = Record<string, unknown>

// Type for Supabase/Postgres errors
interface DatabaseError {
  message: string
  code?: string
}

export async function saveDraftToSupabase(
  patientId: string,
  flowType: string,
  data: DraftData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Check if draft exists
    const { data: existing } = await supabase
      .from("request_answers")
      .select("id")
      .eq("request_id", `draft_${patientId}_${flowType}`)
      .single()

    if (existing) {
      // Update existing draft
      const { error } = await supabase
        .from("request_answers")
        .update({
          answers: data,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (error) throw error
    } else {
      // Create new draft - we'll use a special "draft" request_id format
      // In production, you might want a separate drafts table
      // Note: Using type assertion here as draft IDs use a different format than UUIDs
      const { error } = await supabase.from("request_answers").insert({
        request_id: `draft_${patientId}_${flowType}` as unknown as string,
        answers: data,
      })

      if (error) throw error
    }

    return { success: true }
  } catch (error) {
    const dbError = error as DatabaseError
    console.error("Failed to save draft:", dbError)
    return { success: false, error: dbError.message }
  }
}

export async function loadDraftFromSupabase(
  patientId: string,
  flowType: string,
): Promise<{ success: boolean; data?: DraftData; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("request_answers")
      .select("answers")
      .eq("request_id", `draft_${patientId}_${flowType}`)
      .single()

    if (error && error.code !== "PGRST116") throw error // PGRST116 = not found

    return {
      success: true,
      data: data?.answers as DraftData | undefined,
    }
  } catch (error) {
    const dbError = error as DatabaseError
    console.error("Failed to load draft:", dbError)
    return { success: false, error: dbError.message }
  }
}

export async function deleteDraft(patientId: string, flowType: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("request_answers").delete().eq("request_id", `draft_${patientId}_${flowType}`)

    if (error) throw error

    return { success: true }
  } catch (error) {
    const dbError = error as DatabaseError
    console.error("Failed to delete draft:", dbError)
    return { success: false, error: dbError.message }
  }
}
