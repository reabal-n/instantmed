"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestType } from "@/types/db"

export async function createRequestAction(
  patientId: string,
  type: RequestType,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  const startTime = Date.now()
  
  try {
    console.log("[createRequestAction] Starting:", { patientId, type })
    
    const request = await createRequest(
      {
        patient_id: patientId,
        type,
        status: "pending",
      },
      answers,
    )

    if (!request) {
      console.error("[createRequestAction] Failed to create request:", {
        patientId,
        type,
        duration: Date.now() - startTime,
      })
      return { success: false, error: "Failed to create request. Please try again." }
    }

    console.log("[createRequestAction] Success:", {
      requestId: request.id,
      patientId,
      type,
      duration: Date.now() - startTime,
    })
    
    return { success: true, requestId: request.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[createRequestAction] Exception:", {
      patientId,
      type,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    })
    return { success: false, error: "An unexpected error occurred." }
  }
}
