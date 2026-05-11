"use server"

import * as Sentry from "@sentry/nextjs"

import {
  logNoPrescribingInPlatform,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { acquireIntakeLock } from "@/lib/data/intake-lock"
import {
  getParchmentPatientSyncEligibility,
  getParchmentPrescriberCandidateIds,
  getParchmentPrescribingEligibility,
  isParchmentClaimSatisfied,
} from "@/lib/doctor/parchment-claim"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import {
  createUser,
  disableUser,
  enableUser,
  getParchmentEnvironment,
  getSsoUrl,
  listUsers,
  updateUser,
  updateUserRoles,
  validateIntegration,
} from "@/lib/parchment/client"
import { ParchmentPatientIdentityError, ParchmentPatientSyncError, syncPatientToParchment } from "@/lib/parchment/sync-patient"
import type {
  CreateUserRequest,
  ParchmentAccessRole,
  UpdateUserRequest,
} from "@/lib/parchment/types"
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
        error: "Prescriber account not linked. Go to Doctor Settings > Parchment Prescribing Account to link your Parchment user.",
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
    // The queue sheet is replaced by the Parchment sheet, so its cleanup can release
    // the review context just before this action runs. Re-claim here and verify the
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

    try {
      await validateIntegration(doctorProfile.parchment_user_id)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before prescribing handoff",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return {
        success: false,
        error: "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
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

    revalidateStaff({ ops: true, intakeId, patientId: intake.patient_id })

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
  environment?: ReturnType<typeof getParchmentEnvironment>
  users?: Array<{ user_id: string; full_name: string }>
}> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized", environment: getParchmentEnvironment() }
  }

  const environment = getParchmentEnvironment()
  const callerParchmentUserId = authResult.profile.parchment_user_id?.trim()
  if (!callerParchmentUserId) {
    return {
      success: false,
      error: "Link your Parchment user_id manually before loading the organization user list.",
      environment,
    }
  }

  try {
    const data = await listUsers(callerParchmentUserId)
    return {
      success: true,
      environment,
      users: data.users.map((u) => ({ user_id: u.user_id, full_name: u.full_name })),
    }
  } catch (error) {
    log.error("Failed to list Parchment users", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: `Failed to fetch ${environment.label} users from Parchment`, environment }
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
    const trimmedUserId = parchmentUserId.trim()
    const environment = getParchmentEnvironment()
    const environmentLabel = environment.environment === "unknown" ? "configured Parchment" : `${environment.label} Parchment`
    const expectedEnvironment = environment.environment === "unknown" ? "configured" : environment.label

    const supabase = createServiceRoleClient()
    const { data: existingLink, error: existingLinkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("parchment_user_id", trimmedUserId)
      .neq("id", authResult.profile.id)
      .maybeSingle()

    if (existingLinkError) {
      throw existingLinkError
    }

    if (existingLink) {
      return {
        success: false,
        error: `This ${environmentLabel} user_id is already linked to another InstantMed profile. Sign in with that InstantMed account or ask an admin to transfer the link before recording.`,
      }
    }

    try {
      // Validate the pasted user ID by generating a user-scoped token and calling
      // /validate. This avoids making account linking depend on read:users, which
      // is non-essential and can be disabled in some Parchment sandbox tenants.
      await validateIntegration(trimmedUserId)
    } catch (validationError) {
      log.warn("Parchment account link validation failed", {
        environment: environment.environment,
        apiHost: environment.apiHost,
      }, validationError instanceof Error ? validationError : new Error(String(validationError)))

      return {
        success: false,
        error: `Could not validate this user_id in the ${environmentLabel} environment. Check that you are using the ${expectedEnvironment} Parchment user_id, not the other Parchment environment.`,
      }
    }

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
        error: "Prescriber account not linked. Link your Parchment user before validating the integration.",
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

// ============================================================================
// USER MANAGEMENT - Conformance evidence helper
// ============================================================================

export type ParchmentConformanceLifecycle = "prescriber" | "admin"
export type ParchmentConformanceStep = "create" | "update" | "disable" | "enable"

export interface ParchmentConformanceUserForm {
  givenName: string
  familyName: string
  email: string
  partnerUserId: string
  phone?: string
  accessRoles?: ParchmentAccessRole[]
  updateGivenName?: string
  updateFamilyName?: string
  updatePhone?: string
  updateAccessRoles?: ParchmentAccessRole[]
  title?: string
  dateOfBirth?: string
  sex?: CreateUserRequest["sex"]
  hpiiNumber?: string
  prescriberType?: string
  prescriberNumber?: string
  qualifications?: string
  providerNumber?: string
  ahpraNumber?: string
  hospitalProviderNumber?: string
}

export interface ParchmentConformanceUserStepInput {
  lifecycle: ParchmentConformanceLifecycle
  step: ParchmentConformanceStep
  userId?: string
  user: ParchmentConformanceUserForm
}

export interface ParchmentConformanceUserStepResult {
  label: string
  userId: string
  message?: string
  requestId?: string
  statusCode?: number
  warning?: string
  accessRoles?: ParchmentAccessRole[]
}

export interface ParchmentConformanceUserStepActionResult {
  success: boolean
  error?: string
  userId?: string
  steps?: ParchmentConformanceUserStepResult[]
}

const ACCESS_ROLES: ParchmentAccessRole[] = [
  "admin",
  "provider",
  "receptionist",
  "rx_reader",
  "rx_queue_manager",
]

function cleanString(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeAccessRoles(
  roles: ParchmentAccessRole[] | undefined,
  fallback: ParchmentAccessRole[],
): ParchmentAccessRole[] {
  const normalized = (roles ?? []).filter((role): role is ParchmentAccessRole =>
    ACCESS_ROLES.includes(role),
  )
  return normalized.length > 0 ? normalized : fallback
}

function addOptional<T extends Record<string, unknown>>(
  payload: T,
  key: keyof T,
  value: string | undefined,
) {
  const cleaned = cleanString(value)
  if (cleaned) payload[key] = cleaned as T[keyof T]
}

function requireFields(fields: Record<string, string | undefined>): string | null {
  const missing = Object.entries(fields)
    .filter(([, value]) => !cleanString(value))
    .map(([label]) => label)

  return missing.length > 0
    ? `Missing required Parchment conformance fields: ${missing.join(", ")}`
    : null
}

function buildConformanceCreatePayload(
  lifecycle: ParchmentConformanceLifecycle,
  user: ParchmentConformanceUserForm,
): { payload?: CreateUserRequest; error?: string } {
  const commonMissing = requireFields({
    "given name": user.givenName,
    "family name": user.familyName,
    email: user.email,
    "partner user ID": user.partnerUserId,
  })
  if (commonMissing) return { error: commonMissing }

  const payload: CreateUserRequest = {
    given_name: cleanString(user.givenName)!,
    family_name: cleanString(user.familyName)!,
    email: cleanString(user.email)!,
    partner_user_id: cleanString(user.partnerUserId)!,
    access_roles: normalizeAccessRoles(
      user.accessRoles,
      lifecycle === "prescriber" ? ["provider"] : ["admin"],
    ),
  }
  addOptional(payload, "phone", user.phone)

  if (lifecycle === "prescriber") {
    const prescriberMissing = requireFields({
      "date of birth": user.dateOfBirth,
      sex: user.sex,
      HPII: user.hpiiNumber,
      "prescriber type": user.prescriberType,
      "prescriber number": user.prescriberNumber,
      qualifications: user.qualifications,
    })
    if (prescriberMissing) return { error: prescriberMissing }

    payload.access_roles = ["provider"]
    payload.date_of_birth = cleanString(user.dateOfBirth)
    payload.sex = user.sex
    addOptional(payload, "title", user.title)
    addOptional(payload, "hpii_number", user.hpiiNumber)
    addOptional(payload, "prescriber_type", user.prescriberType)
    addOptional(payload, "prescriber_number", user.prescriberNumber)
    addOptional(payload, "qualifications", user.qualifications)
    addOptional(payload, "provider_number", user.providerNumber)
    addOptional(payload, "ahpra_number", user.ahpraNumber)
    addOptional(payload, "hospital_provider_number", user.hospitalProviderNumber)
  }

  return { payload }
}

function buildConformanceUpdatePayload(
  lifecycle: ParchmentConformanceLifecycle,
  user: ParchmentConformanceUserForm,
): UpdateUserRequest {
  const payload: UpdateUserRequest = {
    given_name: cleanString(user.updateGivenName) || cleanString(user.givenName),
    family_name: cleanString(user.updateFamilyName) || cleanString(user.familyName),
  }
  addOptional(payload, "phone", user.updatePhone || user.phone)

  if (lifecycle === "prescriber") {
    addOptional(payload, "qualifications", user.qualifications)
    addOptional(payload, "provider_number", user.providerNumber)
    addOptional(payload, "ahpra_number", user.ahpraNumber)
  }

  return payload
}

function toStepResult(
  label: string,
  result: Awaited<ReturnType<typeof createUser>>,
): ParchmentConformanceUserStepResult {
  return {
    label,
    userId: result.user_id,
    message: result.message,
    requestId: result.requestId,
    statusCode: result.statusCode,
    warning: typeof result.warning === "string" ? result.warning : undefined,
    accessRoles: result.access_roles,
  }
}

/**
 * Runs a single Parchment sandbox user-management conformance step.
 *
 * This is intentionally admin-only and tied to the logged-in admin's linked
 * Parchment user_id, so the recording proves the authenticated-user token path
 * rather than falling back to an organization-wide service user.
 */
export async function runParchmentConformanceUserStepAction(
  input: ParchmentConformanceUserStepInput,
): Promise<ParchmentConformanceUserStepActionResult> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:user-lifecycle:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment user-management requests. Please wait and try again." }
  }

  const callerParchmentUserId = authResult.profile.parchment_user_id?.trim()
  if (!callerParchmentUserId) {
    return {
      success: false,
      error: "Your admin profile is not linked to a Parchment user_id. Link it in Doctor Settings > Identity before recording this video.",
    }
  }

  if (!["prescriber", "admin"].includes(input.lifecycle)) {
    return { success: false, error: "Invalid Parchment lifecycle type" }
  }

  if (!["create", "update", "disable", "enable"].includes(input.step)) {
    return { success: false, error: "Invalid Parchment lifecycle step" }
  }

  const existingUserId = cleanString(input.userId)
  if (input.step !== "create" && !existingUserId) {
    return { success: false, error: "Create the Parchment sandbox user before running this step." }
  }

  try {
    const steps: ParchmentConformanceUserStepResult[] = []

    if (input.step === "create") {
      const built = buildConformanceCreatePayload(input.lifecycle, input.user)
      if (!built.payload) return { success: false, error: built.error || "Invalid Parchment user payload" }

      const result = await createUser(callerParchmentUserId, built.payload)
      steps.push(toStepResult(
        input.lifecycle === "prescriber" ? "Created prescriber user" : "Created admin user",
        result,
      ))
    }

    if (input.step === "update") {
      const result = await updateUser(
        callerParchmentUserId,
        existingUserId!,
        buildConformanceUpdatePayload(input.lifecycle, input.user),
      )
      steps.push(toStepResult(
        input.lifecycle === "prescriber" ? "Updated prescriber details" : "Updated admin details",
        result,
      ))

      if (input.lifecycle === "admin") {
        const roles = normalizeAccessRoles(input.user.updateAccessRoles, ["admin", "receptionist"])
        const roleResult = await updateUserRoles(callerParchmentUserId, existingUserId!, roles)
        steps.push(toStepResult("Updated admin role access", roleResult))
      }
    }

    if (input.step === "disable") {
      const result = await disableUser(callerParchmentUserId, existingUserId!)
      steps.push(toStepResult(
        input.lifecycle === "prescriber" ? "Disabled prescriber user" : "Disabled admin user",
        result,
      ))
    }

    if (input.step === "enable") {
      const result = await enableUser(callerParchmentUserId, existingUserId!)
      steps.push(toStepResult(
        input.lifecycle === "prescriber" ? "Re-enabled prescriber user" : "Re-enabled admin user",
        result,
      ))
    }

    const lastStep = steps[steps.length - 1]
    return {
      success: true,
      userId: lastStep?.userId || existingUserId,
      steps,
    }
  } catch (error) {
    log.error("Failed to run Parchment user lifecycle conformance step", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, {
      extra: {
        context: "parchment_user_lifecycle_conformance",
        lifecycle: input.lifecycle,
        step: input.step,
      },
    })
    return { success: false, error: "Parchment user-management step failed. Check the sandbox credentials, test data, and linked Parchment user." }
  }
}
