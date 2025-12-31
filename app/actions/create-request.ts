"use server"
import { logger } from "@/lib/logger"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export interface CreateRequestInput {
  category: RequestCategory
  subtype: RequestSubtype | string
  type: string
  answers: Record<string, unknown>
  patientId?: string
  isDraft?: boolean
}

export interface CreateRequestResult {
  success: boolean
  requestId?: string
  error?: string
  errorCode?: string
}

/**
 * Consolidated server action for creating requests
 * Handles validation, service checks, and database insertion
 */
export async function createRequestAction(input: CreateRequestInput): Promise<CreateRequestResult> {
  try {
    // 1. Service availability checks
    const serviceCheck = await checkServiceAvailability(input)
    if (!serviceCheck.available) {
      return {
        success: false,
        error: serviceCheck.error,
        errorCode: serviceCheck.errorCode,
      }
    }

    // 2. Medication validation for prescriptions
    if (input.category === "prescription") {
      const medCheck = await checkMedicationAllowed(input.answers)
      if (!medCheck.allowed) {
        return {
          success: false,
          error: medCheck.error,
          errorCode: SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED,
        }
      }
    }

    // 3. Schema validation for repeat scripts
    if (input.category === "prescription" && input.subtype === "repeat") {
      const validation = validateRepeatScriptPayload(input.answers)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid repeat script request. Please check your form data.",
          errorCode: "VALIDATION_ERROR",
        }
      }
    }

    // 4. Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to submit a request. Please sign in and try again.",
        errorCode: "AUTH_REQUIRED",
      }
    }

    // 5. Get or create profile
    let patientId = input.patientId || authUser.profile?.id

    if (!patientId) {
      const { ensureProfile } = await import("@/app/actions/ensure-profile")
      const { profileId, error: profileError } = await ensureProfile(
        authUser.user.id,
        authUser.user.email || ""
      )

      if (profileError || !profileId) {
        return {
          success: false,
          error: `Unable to create your profile: ${profileError || "Unknown error"}. Please try again or contact support.`,
          errorCode: "PROFILE_ERROR",
        }
      }

      patientId = profileId
    }

    // 6. Create the request
    const supabase = createServiceRoleClient()

    const { data: request, error: requestError } = await supabase
      .from("requests")
      .insert({
        patient_id: patientId,
        type: input.type,
        status: input.isDraft ? "draft" : "pending",
        category: input.category,
        subtype: input.subtype,
        paid: false,
        payment_status: "pending_payment",
      })
      .select("id")
      .single()

    if (requestError || !request) {
      logger.error("[createRequestAction] Error creating request", { error: String(requestError) })

      if (requestError?.code === "23503") {
        return {
          success: false,
          error: "Your profile could not be found. Please sign out and sign in again.",
          errorCode: "PROFILE_NOT_FOUND",
        }
      }

      if (requestError?.code === "42501") {
        return {
          success: false,
          error: "You don't have permission to create requests. Please contact support at help@instantmed.com.au",
          errorCode: "PERMISSION_DENIED",
        }
      }

      return {
        success: false,
        error: "Failed to create your request. Please try again or contact support if this continues.",
        errorCode: "DB_ERROR",
      }
    }

    // 7. Insert the answers
    const { error: answersError } = await supabase.from("request_answers").insert({
      request_id: request.id,
      answers: input.answers,
    })

    if (answersError) {
      logger.error("[createRequestAction] Error creating answers", { error: String(answersError) })
      // Don't fail - the request exists, answers are supplementary
    }

    return {
      success: true,
      requestId: request.id,
    }
  } catch (error) {
    logger.error("[createRequestAction] Unexpected error", { error: String(error) })
    return {
      success: false,
      error: "An unexpected error occurred. Please try again or contact support at help@instantmed.com.au",
      errorCode: "UNEXPECTED_ERROR",
    }
  }
}

/**
 * Save form data as a draft for recovery after payment errors
 */
export async function saveDraftAction(input: CreateRequestInput): Promise<CreateRequestResult> {
  return createRequestAction({ ...input, isDraft: true })
}

/**
 * Update an existing draft request before payment
 */
export async function updateDraftAction(
  requestId: string,
  answers: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    const supabase = createServiceRoleClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from("requests")
      .select("patient_id, status")
      .eq("id", requestId)
      .single()

    if (!existing || existing.patient_id !== authUser.profile?.id) {
      return { success: false, error: "Request not found" }
    }

    if (existing.status !== "draft" && existing.status !== "pending") {
      return { success: false, error: "Cannot update a request that is already being processed" }
    }

    // Update answers
    const { error } = await supabase
      .from("request_answers")
      .upsert({
        request_id: requestId,
        answers,
      })

    if (error) {
      logger.error("[updateDraftAction] Error", { error: String(error) })
      return { success: false, error: "Failed to update draft" }
    }

    return { success: true }
  } catch (error) {
    logger.error("[updateDraftAction] Unexpected error", { error: String(error) })
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Helper functions

async function checkServiceAvailability(input: CreateRequestInput): Promise<{
  available: boolean
  error?: string
  errorCode?: string
}> {
  const categoryMap: Record<string, "medical_certificate" | "prescription" | "other"> = {
    medical_certificate: "medical_certificate",
    prescription: "prescription",
    consult: "other",
  }

  const serviceCategory = categoryMap[input.category] || "other"

  if (await isServiceDisabled(serviceCategory)) {
    const errorCode =
      serviceCategory === "medical_certificate"
        ? SERVICE_DISABLED_ERRORS.MED_CERT_DISABLED
        : serviceCategory === "prescription"
          ? SERVICE_DISABLED_ERRORS.REPEAT_SCRIPTS_DISABLED
          : SERVICE_DISABLED_ERRORS.CONSULTS_DISABLED

    return {
      available: false,
      error: `This service is temporarily unavailable. Please try again later or contact support at help@instantmed.com.au [${errorCode}]`,
      errorCode,
    }
  }

  return { available: true }
}

async function checkMedicationAllowed(answers: Record<string, unknown>): Promise<{
  allowed: boolean
  error?: string
}> {
  const medicationName = answers.medication_name as string | undefined
  const medicationDisplay = answers.medication_display as string | undefined
  const medication = answers.medication as string | undefined

  const medToCheck = medicationName || medicationDisplay || medication

  if (!medToCheck) {
    return { allowed: true }
  }

  const medCheck = await isMedicationBlocked(medToCheck)

  if (medCheck.blocked) {
    return {
      allowed: false,
      error: `This medication cannot be prescribed through our online service for safety and compliance reasons. Please visit your regular GP for this prescription.`,
    }
  }

  return { allowed: true }
}
