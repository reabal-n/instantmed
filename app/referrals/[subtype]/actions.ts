"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export async function createReferralRequestAction(
  patientId: string,
  category: string,
  subtype: string,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  const startTime = Date.now()
  
  try {
    // Map pathology-imaging to pathology_imaging for database
    const dbSubtype = subtype === "pathology-imaging" ? "pathology_imaging" : subtype

    console.log("[createReferralRequestAction] Starting:", {
      patientId,
      category,
      subtype,
      dbSubtype,
    })

    const request = await createRequest(
      {
        patient_id: patientId,
        type: "referral",
        status: "pending",
        category: category as RequestCategory,
        subtype: dbSubtype as RequestSubtype,
      },
      answers,
      {
        category: category as RequestCategory,
        subtype: dbSubtype as RequestSubtype,
      },
    )

    if (!request) {
      console.error("[createReferralRequestAction] Failed:", {
        patientId,
        category,
        subtype,
        duration: Date.now() - startTime,
      })
      return { success: false, error: "Failed to create request. Please try again." }
    }

    console.log("[createReferralRequestAction] Success:", {
      requestId: request.id,
      patientId,
      duration: Date.now() - startTime,
    })
    
    return { success: true, requestId: request.id }
  } catch (error) {
    console.error("[createReferralRequestAction] Exception:", {
      patientId,
      category,
      subtype,
      error: error instanceof Error ? error.message : "Unknown",
      duration: Date.now() - startTime,
    })
    return { success: false, error: "An unexpected error occurred." }
  }
}
