"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import {
  logNoPrescribingInPlatform,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { acquireIntakeLock } from "@/lib/data/intake-lock"
import {
  getParchmentPatientSyncEligibility,
  getParchmentPrescriberCandidateIds,
  getParchmentPrescribingEligibility,
  isParchmentClaimSatisfied,
} from "@/lib/doctor/parchment-claim"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { getSsoUrl, listUsers, validateIntegration } from "@/lib/parchment/client"
import { ParchmentPatientIdentityError, ParchmentPatientSyncError, syncPatientToParchment } from "@/lib/parchment/sync-patient"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { readAnswers } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const log = createLogger("parchment-actions")

type ServiceRelation = { type?: string | null } | { type?: string | null }[] | null

function getServiceType(service: ServiceRelation | undefined): string | null {
  return Array.isArray(service) ? service[0]?.type ?? null : service?.type ?? null
}

function getParchmentAuditRequestType({
  category,
  serviceType,
}: {
  category?: string | null
  serviceType?: string | null
}): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (
    category === "prescription" ||
    serviceType === "common_scripts" ||
    serviceType === "repeat_rx" ||
    serviceType === "prescription" ||
    serviceType === "repeat-script"
  ) {
    return "repeat_rx"
  }
  return "intake"
}

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

  const rateLimit = await checkServerActionRateLimit(`parchment:sso:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment requests. Please wait and try again." }
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

    // Get patient_id from the intake and enforce prescribing eligibility server-side.
    const { data: intake } = await supabase
      .from("intakes")
      .select(`
        patient_id,
        status,
        payment_status,
        category,
        subtype,
        claimed_by,
        reviewing_doctor_id,
        reviewed_by,
        service:services!service_id(type)
      `)
      .eq("id", intakeId)
      .single()

    if (!intake?.patient_id) {
      return { success: false, error: "Intake or patient not found" }
    }

    const serviceType = getServiceType(intake.service)
    const eligibility = getParchmentPrescribingEligibility({
      status: intake.status,
      payment_status: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
    })
    if (!eligibility.eligible) {
      log.warn("Parchment prescribe blocked by intake eligibility", {
        status: intake.status,
        paymentStatus: intake.payment_status,
        category: intake.category,
        subtype: intake.subtype,
        serviceType,
      })
      return { success: false, error: eligibility.error }
    }

    // Defense-in-depth: ensure a live doctor-owned review claim exists before SSO.
    // The queue sheet is replaced by the Parchment sheet, so its cleanup can clear
    // the soft lock just before this action runs. Re-claim here and verify the
    // resulting row instead of trusting UI lifecycle timing.
    if (!isParchmentClaimSatisfied(intake, authResult.profile.id)) {
      const claim = await acquireIntakeLock(
        intakeId,
        authResult.profile.id,
        authResult.profile.full_name || "Doctor",
      )

      if (!claim.acquired) {
        log.warn("Parchment prescribe attempted while another clinician owns the review lock")
        return { success: false, error: claim.warning || "This intake is currently claimed by another clinician." }
      }

      const { data: refreshedIntake } = await supabase
        .from("intakes")
        .select("claimed_by, reviewing_doctor_id, reviewed_by")
        .eq("id", intakeId)
        .single()

      if (!refreshedIntake || !isParchmentClaimSatisfied(refreshedIntake, authResult.profile.id)) {
        log.warn("Parchment prescribe blocked because review claim could not be verified")
        return { success: false, error: "You must claim this intake before prescribing" }
      }
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

    try {
      await logNoPrescribingInPlatform(
        intakeId,
        getParchmentAuditRequestType({ category: intake.category, serviceType }),
        authResult.profile.id,
      )
    } catch (auditError) {
      log.warn("Failed to log Parchment prescribing boundary evidence", {}, auditError)
    }

    log.info("Parchment prescribe URL generated")

    return {
      success: true,
      ssoUrl: ssoData.redirect_url,
      parchmentPatientId,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      log.warn("Parchment prescribe blocked by incomplete prescribing identity", {
        missingFields: error.issues,
      })
      return { success: false, error: `Missing prescribing details: ${error.issues.join(", ")}` }
    }

    if (error instanceof ParchmentPatientSyncError) {
      log.warn("Parchment prescribe blocked by patient sync failure")
      Sentry.captureException(error, { extra: { context: "parchment_prescribe_patient_sync" } })
      return { success: false, error: "Failed to refresh patient details in Parchment. Retry after confirming the patient details." }
    }

    log.error("Failed to get Parchment prescribe URL", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "parchment_prescribe_url" } })
    return { success: false, error: "Failed to connect to Parchment. Please try again or use manual prescribing." }
  }
}

export async function retryParchmentPatientSyncAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; missingFields?: string[] }> {
  if (!UUID_RE.test(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:sync-retry:${authResult.profile.id}`, "sensitive")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment sync attempts. Please wait and try again." }
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select(`
        patient_id,
        status,
        payment_status,
        category,
        subtype,
        claimed_by,
        reviewing_doctor_id,
        reviewed_by,
        service:services!service_id(type)
      `)
      .eq("id", intakeId)
      .single()

    if (!intake?.patient_id) {
      return { success: false, error: "Intake or patient not found" }
    }

    const serviceType = getServiceType(intake.service)
    const syncEligibility = getParchmentPatientSyncEligibility({
      status: intake.status,
      payment_status: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
    })
    if (!syncEligibility.eligible) {
      log.warn("Parchment patient sync retry blocked by intake eligibility", {
        status: intake.status,
        paymentStatus: intake.payment_status,
        category: intake.category,
        subtype: intake.subtype,
        serviceType,
      })
      return { success: false, error: syncEligibility.error }
    }

    let parchmentUserId: string | null = null
    const candidateDoctorIds = getParchmentPrescriberCandidateIds(intake)

    if (candidateDoctorIds.length > 0) {
      const { data: doctorProfiles } = await supabase
        .from("profiles")
        .select("id, parchment_user_id")
        .in("id", candidateDoctorIds)
        .not("parchment_user_id", "is", null)

      const linkedDoctor = candidateDoctorIds
        .map((id) => doctorProfiles?.find((profile) => profile.id === id && profile.parchment_user_id))
        .find(Boolean)

      parchmentUserId = linkedDoctor?.parchment_user_id ?? null
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

    log.info("Parchment patient sync retried")
    return { success: true }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      log.warn("Parchment retry blocked by incomplete prescribing identity", {
        missingFields: error.issues,
      })
      return {
        success: false,
        error: `Missing prescribing details: ${error.issues.join(", ")}`,
        missingFields: error.issues,
      }
    }

    log.error("Failed to retry Parchment patient sync", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "parchment_patient_sync_retry" } })
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
    const data = await listUsers(authResult.profile.parchment_user_id ?? undefined)
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

    log.info("Parchment account linked")

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
