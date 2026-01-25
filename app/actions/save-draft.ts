"use server"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("save-draft")

import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Type for draft data - using unknown for type safety
type DraftData = Record<string, unknown>

// CRITICAL: Allowed flow types to prevent injection attacks
const ALLOWED_FLOW_TYPES = ["prescription", "med_cert", "consult", "repeat_script"] as const
type FlowType = typeof ALLOWED_FLOW_TYPES[number]

function isValidFlowType(flowType: string): flowType is FlowType {
  return ALLOWED_FLOW_TYPES.includes(flowType as FlowType)
}

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
  // CRITICAL: Validate flowType to prevent injection
  if (!isValidFlowType(flowType)) {
    log.warn("Invalid flowType in saveDraftToSupabase", { flowType, patientId })
    return { success: false, error: "Invalid flow type" }
  }

  try {
    const supabase = createServiceRoleClient()

    // Check if draft exists
    const { data: existing } = await supabase
      .from("request_answers")
      .select("id")
      .eq("request_id", `draft_${patientId}_${flowType}`)
      .single()

    if (existing) {
      // Update existing draft - only update answers and updated_at, not created_at
      const { error } = await supabase
        .from("request_answers")
        .update({
          answers: data,
          updated_at: new Date().toISOString(),
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
    log.error("Failed to save draft", { error: String(dbError) })
    return { success: false, error: dbError.message }
  }
}

export async function loadDraftFromSupabase(
  patientId: string,
  flowType: string,
): Promise<{ success: boolean; data?: DraftData; error?: string }> {
  // CRITICAL: Validate flowType to prevent injection
  if (!isValidFlowType(flowType)) {
    log.warn("Invalid flowType in loadDraftFromSupabase", { flowType, patientId })
    return { success: false, error: "Invalid flow type" }
  }

  try {
    const supabase = createServiceRoleClient()

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
    log.error("Failed to load draft", { error: String(dbError) })
    return { success: false, error: dbError.message }
  }
}

export async function deleteDraft(patientId: string, flowType: string): Promise<{ success: boolean; error?: string }> {
  // CRITICAL: Validate flowType to prevent injection
  if (!isValidFlowType(flowType)) {
    log.warn("Invalid flowType in deleteDraft", { flowType, patientId })
    return { success: false, error: "Invalid flow type" }
  }

  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from("request_answers").delete().eq("request_id", `draft_${patientId}_${flowType}`)

    if (error) throw error

    return { success: true }
  } catch (error) {
    const dbError = error as DatabaseError
    log.error("Failed to delete draft", { error: String(dbError) })
    return { success: false, error: dbError.message }
  }
}
