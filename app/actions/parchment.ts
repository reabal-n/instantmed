"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { getSsoUrl, listUsers, validateIntegration } from "@/lib/parchment/client"
import { ParchmentPatientIdentityError, syncPatientToParchment } from "@/lib/parchment/sync-patient"
import { readAnswers } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const log = createLogger("parchment-actions")

// ============================================================================
// SSO - Get prescribing URL for embedded iframe
// ============================================================================

/**
 * Sync a patient to Parchment and get an SSO URL for the embedded prescribing iframe.
 *
 * Flow: validate auth → get doctor's parchment_user_id → sync patient → generate SSO URL
 */
export async function getParchmentPrescribeUrlAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; ssoUrl?: string; parchmentPatientId?: string }> {
  if (!UUID_RE.test(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  // Defense-in-depth: block if feature flag is off (UI also guards this)
  const flags = await getFeatureFlags()
  if (!flags.parchment_embedded_prescribing) {
    return { success: false, error: "Embedded prescribing is not enabled" }
  }

  try {
    const supabase = createServiceRoleClient()

    // Get doctor's parchment_user_id
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("parchment_user_id")
      .eq("id", authResult.profile.id)
      .single()

    if (!doctorProfile?.parchment_user_id) {
      return {
        success: false,
        error: "Parchment account not linked. Go to Settings → Identity to connect your Parchment account.",
      }
    }

    // Get patient_id from the intake (verify doctor owns it)
    const { data: intake } = await supabase
      .from("intakes")
      .select("patient_id, claimed_by")
      .eq("id", intakeId)
      .single()

    if (!intake?.patient_id) {
      return { success: false, error: "Intake or patient not found" }
    }

    // Defense-in-depth: verify this doctor claimed the intake
    if (intake.claimed_by !== authResult.profile.id) {
      log.warn("Parchment prescribe attempted by non-claiming doctor", {
        intakeId,
        claimedBy: intake.claimed_by,
        attemptedBy: authResult.profile.id,
      })
      return { success: false, error: "You must claim this intake before prescribing" }
    }

    const { data: answerRow } = await supabase
      .from("intake_answers")
      .select("answers, answers_encrypted")
      .eq("intake_id", intakeId)
      .maybeSingle()

    // Extract answers for sex field fallback.
    const answers = answerRow
      ? (await readAnswers({
          answers: answerRow.answers as Record<string, unknown> | null,
          answers_enc: answerRow.answers_encrypted as never,
        })) ?? undefined
      : undefined

    // Sync patient to Parchment (idempotent - returns existing ID if already synced)
    const parchmentPatientId = await syncPatientToParchment(
      intake.patient_id,
      doctorProfile.parchment_user_id,
      answers,
    )

    // Generate SSO URL for embedded prescribing
    const ssoData = await getSsoUrl(
      doctorProfile.parchment_user_id,
      `/embed/patients/${parchmentPatientId}/prescriptions`,
    )

    log.info("Parchment prescribe URL generated", {
      intakeId,
      doctorId: authResult.profile.id,
    })

    return {
      success: true,
      ssoUrl: ssoData.redirect_url,
      parchmentPatientId,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      log.warn("Parchment prescribe blocked by incomplete prescribing identity", {
        intakeId,
        missingFields: error.issues,
      })
      return { success: false, error: `Missing prescribing details: ${error.issues.join(", ")}` }
    }

    log.error("Failed to get Parchment prescribe URL", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { intakeId } })
    return { success: false, error: "Failed to connect to Parchment. Please try again or use manual prescribing." }
  }
}

export async function retryParchmentPatientSyncAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; missingFields?: string[] }> {
  if (!UUID_RE.test(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("patient_id, claimed_by, reviewing_doctor_id, reviewed_by")
      .eq("id", intakeId)
      .single()

    if (!intake?.patient_id) {
      return { success: false, error: "Intake or patient not found" }
    }

    let parchmentUserId = authResult.profile.parchment_user_id ?? null

    if (!parchmentUserId) {
      const candidateDoctorIds = [
        intake.claimed_by,
        intake.reviewing_doctor_id,
        intake.reviewed_by,
      ].filter((value): value is string => Boolean(value))

      if (candidateDoctorIds.length > 0) {
        const { data: doctorProfile } = await supabase
          .from("profiles")
          .select("parchment_user_id")
          .in("id", candidateDoctorIds)
          .not("parchment_user_id", "is", null)
          .limit(1)
          .maybeSingle()

        parchmentUserId = doctorProfile?.parchment_user_id ?? null
      }
    }

    if (!parchmentUserId) {
      return {
        success: false,
        error: "No linked Parchment prescriber is available. Assign or claim the intake with a linked doctor first.",
      }
    }

    const { data: answerRow } = await supabase
      .from("intake_answers")
      .select("answers, answers_encrypted")
      .eq("intake_id", intakeId)
      .maybeSingle()

    const answers = answerRow
      ? (await readAnswers({
          answers: answerRow.answers as Record<string, unknown> | null,
          answers_enc: answerRow.answers_encrypted as never,
        })) ?? undefined
      : undefined

    await syncPatientToParchment(intake.patient_id, parchmentUserId, answers)

    revalidatePath("/admin/ops")
    revalidatePath("/admin/ops/prescribing-identity")
    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/doctor/patients/${intake.patient_id}`)

    log.info("Parchment patient sync retried", { intakeId })
    return { success: true }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      log.warn("Parchment retry blocked by incomplete prescribing identity", {
        intakeId,
        missingFields: error.issues,
      })
      return {
        success: false,
        error: `Missing prescribing details: ${error.issues.join(", ")}`,
        missingFields: error.issues,
      }
    }

    log.error("Failed to retry Parchment patient sync", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { intakeId } })
    return { success: false, error: "Failed to sync patient to Parchment. Check integration status and try again." }
  }
}

// ============================================================================
// ACCOUNT LINKING - Link doctor to Parchment user
// ============================================================================

/**
 * Fetch available Parchment users for account linking.
 */
export async function listParchmentUsersAction(): Promise<{
  success: boolean
  error?: string
  users?: Array<{ user_id: string; full_name: string }>
}> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const data = await listUsers()
    return {
      success: true,
      users: data.users.map((u) => ({ user_id: u.user_id, full_name: u.full_name })),
    }
  } catch (error) {
    log.error("Failed to list Parchment users", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Failed to fetch users from Parchment" }
  }
}

/**
 * Link the current doctor's profile to a Parchment user.
 */
export async function linkParchmentUserAction(
  parchmentUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  if (!parchmentUserId || parchmentUserId.trim() === "") {
    return { success: false, error: "Parchment user ID is required" }
  }

  try {
    // Validate the pasted user ID by generating a user-scoped token and calling
    // /validate. This avoids making account linking depend on read:users, which
    // is non-essential and can be disabled in some Parchment sandbox tenants.
    const trimmedUserId = parchmentUserId.trim()
    await validateIntegration(trimmedUserId)

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        parchment_user_id: trimmedUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authResult.profile.id)

    if (error) {
      throw error
    }

    log.info("Parchment account linked", {
      doctorId: authResult.profile.id,
      parchmentUserId: trimmedUserId,
    })

    return { success: true }
  } catch (error) {
    log.error("Failed to link Parchment account", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return { success: false, error: "Failed to save Parchment user link" }
  }
}

// ============================================================================
// VALIDATION - Conformance evidence for sandbox / production approval
// ============================================================================

/**
 * Validate the linked Parchment integration for the currently logged-in doctor.
 *
 * This deliberately generates the token for the linked Parchment user before
 * calling /validate, matching Parchment's conformance requirement.
 */
export async function validateParchmentIntegrationAction(): Promise<{
  success: boolean
  error?: string
  message?: string
  requestId?: string
}> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("parchment_user_id")
      .eq("id", authResult.profile.id)
      .single()

    if (!doctorProfile?.parchment_user_id) {
      return {
        success: false,
        error: "Parchment account not linked. Link your user before validating the integration.",
      }
    }

    const data = await validateIntegration(doctorProfile.parchment_user_id)
    return {
      success: data.validated,
      message: data.message || (data.validated ? "Parchment integration validated" : "Validation failed"),
      requestId: data.requestId,
    }
  } catch (error) {
    log.error("Failed to validate Parchment integration", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return { success: false, error: "Failed to validate Parchment integration" }
  }
}
