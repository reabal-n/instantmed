"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export async function createPrescriptionRequestAction(
  patientId: string,
  category: string,
  subtype: string,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
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
      return { success: false, error: "Failed to create request. Please try again." }
    }

    return { success: true, requestId: request.id }
  } catch {
    return { success: false, error: "An unexpected error occurred." }
  }
}
