"use server"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("create-request")

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { isServiceDisabled, isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"
import { validateConsultPayload } from "@/lib/validation/schemas"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import type { RequestCategory, RequestSubtype } from "@/types/db"

export interface CreateRequestInput {
  category: RequestCategory | string
  subtype: RequestSubtype | string
  type: string
  serviceId?: string
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
    // 0. Get authenticated user first for rate limiting
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to submit a request. Please sign in and try again.",
        errorCode: "AUTH_REQUIRED",
      }
    }

    // 0b. Rate limiting - prevent abuse
    const rateLimit = await checkServerActionRateLimit(authUser.user.id, "sensitive")
    if (!rateLimit.success) {
      return {
        success: false,
        error: rateLimit.error || "Too many requests. Please wait before trying again.",
        errorCode: "RATE_LIMITED",
      }
    }

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

    // 3b. Schema validation for consults
    if (input.type === "consult" || input.category === "other") {
      const validation = validateConsultPayload(input.answers)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid consultation request. Please check your form data.",
          errorCode: "VALIDATION_ERROR",
        }
      }
    }

    // 4. Get or create profile (authUser already verified at step 0)
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

    // 6. Create the intake (single source of truth)
    const supabase = createServiceRoleClient()

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .insert({
        patient_id: patientId,
        service_id: input.serviceId || null,
        status: input.isDraft ? "draft" : "pending_payment",
        category: input.category,
        subtype: input.subtype,
        payment_status: "pending",
      })
      .select("id")
      .single()

    if (intakeError || !intake) {
      log.error("[createRequestAction] Error creating intake", { error: String(intakeError) })

      if (intakeError?.code === "23503") {
        return {
          success: false,
          error: "Your profile could not be found. Please sign out and sign in again.",
          errorCode: "PROFILE_NOT_FOUND",
        }
      }

      if (intakeError?.code === "42501") {
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
    const { error: answersError } = await supabase.from("intake_answers").insert({
      intake_id: intake.id,
      answers: input.answers,
    })

    if (answersError) {
      log.error("[createRequestAction] Error creating answers", { error: String(answersError) })
      // Don't fail - the request exists, answers are supplementary
    }

    return {
      success: true,
      requestId: intake.id,
    }
  } catch (error) {
    log.error("[createRequestAction] Unexpected error", { error: String(error) })
    return {
      success: false,
      error: "We couldn't create your request. Please try again or contact us at help@instantmed.com.au",
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

    // Verify ownership (use intakes table)
    const { data: existing } = await supabase
      .from("intakes")
      .select("patient_id, status")
      .eq("id", requestId)
      .single()

    if (!existing || existing.patient_id !== authUser.profile?.id) {
      return { success: false, error: "Request not found" }
    }

    if (existing.status !== "draft" && existing.status !== "pending_payment") {
      return { success: false, error: "Cannot update a request that is already being processed" }
    }

    // Update answers (use intake_answers table)
    const { error } = await supabase
      .from("intake_answers")
      .upsert({
        intake_id: requestId,
        answers,
      })

    if (error) {
      log.error("[updateDraftAction] Error", { error: String(error) })
      return { success: false, error: "Failed to update draft" }
    }

    return { success: true }
  } catch (error) {
    log.error("[updateDraftAction] Unexpected error", { error: String(error) })
    return { success: false, error: "We couldn't save your changes. Please try again." }
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
