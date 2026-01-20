"use server"

import { createIntake } from "@/lib/data/intakes"

export async function createPrescriptionRequestAction(
  patientId: string,
  _category: string,
  _subtype: string,
  answers: Record<string, unknown>,
  serviceId?: string,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    // Use intakes as single source of truth
    const intake = await createIntake(
      patientId,
      serviceId || "", // serviceId should be provided
      answers,
      { status: "pending_payment" }
    )

    if (!intake) {
      return { success: false, error: "Failed to create request. Please try again." }
    }

    return { success: true, requestId: intake.id }
  } catch {
    return { success: false, error: "An unexpected error occurred." }
  }
}
