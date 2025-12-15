"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export async function createMedCertRequestAction(
  patientId: string,
  category: string,
  subtype: string,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  const startTime = Date.now()
  
  try {
    console.log("[createMedCertRequestAction] Starting:", {
      patientId,
      category,
      subtype,
    })
    
    const request = await createRequest(
      {
        patient_id: patientId,
        type: "med_cert",
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
      console.error("[createMedCertRequestAction] Failed to create request:", {
        patientId,
        category,
        subtype,
        duration: Date.now() - startTime,
      })
      return { success: false, error: "Failed to create request. Please try again." }
    }

    console.log("[createMedCertRequestAction] Success:", {
      requestId: request.id,
      patientId,
      category,
      subtype,
      duration: Date.now() - startTime,
    })
    
    return { success: true, requestId: request.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[createMedCertRequestAction] Exception:", {
      patientId,
      category,
      subtype,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    })
    return { success: false, error: "An unexpected error occurred." }
  }
}
