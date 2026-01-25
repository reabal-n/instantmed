"use server"

import { createIntake } from "@/lib/data/intakes"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { z } from "zod"

const logger = createLogger("prescription-actions")

// Validation schema for prescription answers
const prescriptionAnswersSchema = z.object({
  medication_name: z.string().optional(),
  medication_strength: z.string().optional(),
  medication_form: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  reason: z.string().optional(),
}).passthrough() // Allow additional fields

export async function createPrescriptionRequestAction(
  patientId: string,
  _category: string,
  _subtype: string,
  answers: Record<string, unknown>,
  serviceId?: string,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    // CRITICAL: Verify the caller is authenticated and owns this patientId
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      logger.warn("Unauthenticated prescription request attempt")
      return { success: false, error: "You must be logged in to create a request." }
    }

    if (authUser.profile.id !== patientId) {
      logger.error("Authorization bypass attempt in prescription action", {
        callerProfileId: authUser.profile.id,
        requestedPatientId: patientId,
        userId: authUser.user.id,
      })
      return { success: false, error: "You are not authorized to create this request." }
    }

    // Validate answers
    const validationResult = prescriptionAnswersSchema.safeParse(answers)
    if (!validationResult.success) {
      logger.warn("Invalid prescription answers", { 
        issues: validationResult.error.issues,
        patientId 
      })
      return { success: false, error: "Invalid request data. Please check your inputs." }
    }

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
  } catch (error) {
    logger.error("Unexpected error in createPrescriptionRequestAction", 
      { patientId, serviceId },
      error instanceof Error ? error : new Error(String(error))
    )
    return { success: false, error: "An unexpected error occurred." }
  }
}
