"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export async function createPrescriptionRequestAction(
  patientId: string,
  category: string,
  subtype: string,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  const startTime = Date.now()
  
  try {
    console.log("[createPrescriptionRequestAction] Starting:", {
      patientId,
      category,
      subtype,
    })
    
    const request = await createRequest(
      {
        patient_id: patientId,
        type: "script",
        status: "pending",
        category: category as RequestCategory,
        subtype: subtype as RequestSubtype,
      },
      answers,
      {
        category: category as RequestCategory,
        subtype: subtype as RequestSubtype,
      },
    )

    if (!request) {
      console.error("[createPrescriptionRequestAction] Failed:", {
        patientId,
        category,
        subtype,
        duration: Date.now() - startTime,
      })
      return { success: false, error: "Failed to create request. Please try again." }
    }

    console.log("[createPrescriptionRequestAction] Success:", {
      requestId: request.id,
      patientId,
      duration: Date.now() - startTime,
    })
    
    return { success: true, requestId: request.id }
  } catch (error) {
    console.error("[createPrescriptionRequestAction] Exception:", {
      patientId,
      category,
      subtype,
      error: error instanceof Error ? error.message : "Unknown",
      duration: Date.now() - startTime,
    })
    return { success: false, error: "An unexpected error occurred." }
  }
}
