"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestType } from "@/types/db"

export async function createRequestAction(
  patientId: string,
  type: RequestType,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const request = await createRequest(
      {
        patient_id: patientId,
        type,
        status: "pending",
      },
      answers,
    )

    if (!request) {
      return { success: false, error: "Failed to create request. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in createRequestAction:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}
