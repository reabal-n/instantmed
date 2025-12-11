"use server"

import { createRequest } from "@/lib/data/requests"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export async function createReferralRequestAction(
  patientId: string,
  category: string,
  subtype: string,
  answers: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Map pathology-imaging to pathology_imaging for database
    const dbSubtype = subtype === "pathology-imaging" ? "pathology_imaging" : subtype

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
      return { success: false, error: "Failed to create request. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in createReferralRequestAction:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}
