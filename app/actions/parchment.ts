"use server"

import { requireRoleOrNull } from "@/lib/auth"
import { syncPatientToParchment } from "@/lib/parchment/sync-patient"
import { getSsoUrl, listUsers } from "@/lib/parchment/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

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
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
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

    // Get patient_id and answers from the intake
    const { data: intake } = await supabase
      .from("intakes")
      .select("patient_id, answers")
      .eq("id", intakeId)
      .single()

    if (!intake?.patient_id) {
      return { success: false, error: "Intake or patient not found" }
    }

    // Extract answers for sex field fallback
    const answers = (intake.answers as { answers?: Record<string, unknown> })?.answers

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
      parchmentPatientId,
    })

    return {
      success: true,
      ssoUrl: ssoData.redirect_url,
      parchmentPatientId,
    }
  } catch (error) {
    log.error("Failed to get Parchment prescribe URL", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { intakeId } })
    return { success: false, error: "Failed to connect to Parchment. Please try again or use manual prescribing." }
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
    // Validate the user ID exists in Parchment before saving
    const usersData = await listUsers()
    const validUser = usersData.users.find((u) => u.user_id === parchmentUserId.trim())
    if (!validUser) {
      return { success: false, error: "Parchment user ID not found. Check the ID and try again." }
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        parchment_user_id: parchmentUserId.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authResult.profile.id)

    if (error) {
      throw error
    }

    log.info("Parchment account linked", {
      doctorId: authResult.profile.id,
      parchmentUserId,
      parchmentUserName: validUser.full_name,
    })

    return { success: true }
  } catch (error) {
    log.error("Failed to link Parchment account", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return { success: false, error: "Failed to save Parchment user link" }
  }
}
