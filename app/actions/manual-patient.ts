"use server"

import * as Sentry from "@sentry/nextjs"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { encryptProfilePhi, getProfileById } from "@/lib/data/profiles"
import {
  buildManualPatientDuplicateLookup,
  buildManualPatientProfileCreate,
  type ManualPatientFieldErrors,
  type ManualPatientFormValues,
} from "@/lib/doctor/manual-patient"
import { checkParchmentPrescribingCapability } from "@/lib/doctor/parchment-prescribing-capability"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { getSsoUrl, validateIntegration } from "@/lib/parchment/client"
import {
  getParchmentPatientIdentityIssues,
  ParchmentPatientIdentityError,
  ParchmentPatientSyncError,
  syncPatientToParchment,
} from "@/lib/parchment/sync-patient"
import { syncParchmentPrescriptionListToPms } from "@/lib/parchment/sync-prescription"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const log = createLogger("manual-patient-actions")

interface DuplicatePatient {
  id: string
  fullName: string
}

interface DuplicatePatientRow {
  id: string
  full_name: string | null
  date_of_birth: string | null
  normalized_email: string | null
  normalized_phone: string | null
}

export interface CreateManualPatientInput extends ManualPatientFormValues {
  syncToParchment?: boolean
}

export interface CreateManualPatientActionResult {
  success: boolean
  error?: string
  warning?: string
  fieldErrors?: ManualPatientFieldErrors
  patientId?: string
  parchmentPatientId?: string
  syncedToParchment?: boolean
  duplicatePatient?: DuplicatePatient
}

export interface PatientParchmentPrescribeUrlActionResult {
  success: boolean
  error?: string
  ssoUrl?: string
  parchmentPatientId?: string
}

export interface SyncPatientParchmentProfileActionResult {
  success: boolean
  error?: string
  parchmentPatientId?: string
  syncedToParchment?: boolean
}

export interface RefreshPatientParchmentPrescriptionsActionResult {
  success: boolean
  error?: string
  parchmentPatientId?: string
  syncedCount?: number
  failedCount?: number
  requestId?: string
}

function normalizeName(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? ""
}

function actorTypeForRole(role: string): "doctor" | "admin" {
  return role === "admin" ? "admin" : "doctor"
}

async function getCallerParchmentUserId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("parchment_user_id")
    .eq("id", profileId)
    .maybeSingle()

  return typeof data?.parchment_user_id === "string" && data.parchment_user_id.trim()
    ? data.parchment_user_id.trim()
    : null
}

async function findDuplicatePatient(
  supabase: ReturnType<typeof createServiceRoleClient>,
  input: ManualPatientFormValues,
): Promise<DuplicatePatient | null> {
  const lookup = buildManualPatientDuplicateLookup(input)
  const selectColumns = "id, full_name, date_of_birth, normalized_email, normalized_phone"

  const baseQuery = () => supabase
    .from("profiles")
    .select(selectColumns)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)

  const { data: emailMatches } = await baseQuery()
    .eq("normalized_email", lookup.normalizedEmail)
    .limit(1)

  const emailMatch = (emailMatches?.[0] as DuplicatePatientRow | undefined) ?? null
  if (emailMatch) {
    return { id: emailMatch.id, fullName: emailMatch.full_name || "Existing patient" }
  }

  const { data: phoneMatches } = await baseQuery()
    .eq("normalized_phone", lookup.normalizedPhone)
    .limit(1)

  const phoneMatch = (phoneMatches?.[0] as DuplicatePatientRow | undefined) ?? null
  if (phoneMatch) {
    return { id: phoneMatch.id, fullName: phoneMatch.full_name || "Existing patient" }
  }

  const [normalizedName, dateOfBirth] = lookup.normalizedNameDob.split("|")
  if (!dateOfBirth) return null

  const { data: dobMatches } = await baseQuery()
    .eq("date_of_birth", dateOfBirth)
    .limit(25)

  const nameDobMatch = ((dobMatches || []) as DuplicatePatientRow[])
    .find((row) => normalizeName(row.full_name) === normalizedName)

  return nameDobMatch
    ? { id: nameDobMatch.id, fullName: nameDobMatch.full_name || "Existing patient" }
    : null
}

function formatParchmentSyncError(error: unknown): string {
  if (error instanceof ParchmentPatientIdentityError) {
    return `Missing prescribing details: ${error.issues.join(", ")}`
  }
  if (error instanceof ParchmentPatientSyncError) {
    return "Parchment rejected the patient details. Check Medicare, address, DOB, phone, and sex; then retry."
  }
  return "Failed to sync patient to Parchment. Confirm the integration status and try again."
}

export async function createManualPatientAction(
  input: CreateManualPatientInput,
): Promise<CreateManualPatientActionResult> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`manual-patient:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many patient creation attempts. Please wait and try again." }
  }

  const validation = buildManualPatientProfileCreate(input)
  if (!validation.valid || !validation.profile) {
    return {
      success: false,
      error: "Fix the highlighted patient details.",
      fieldErrors: validation.fieldErrors,
    }
  }

  try {
    const supabase = createServiceRoleClient()
    const syncToParchment = input.syncToParchment !== false
    let callerParchmentUserId: string | null = null

    if (syncToParchment) {
      const flags = await getFeatureFlags()
      if (!flags.parchment_embedded_prescribing) {
        return { success: false, error: "Embedded prescribing is not enabled." }
      }

      callerParchmentUserId = await getCallerParchmentUserId(supabase, authResult.profile.id)
      if (!callerParchmentUserId) {
        return {
          success: false,
          error: "Prescriber account not linked. Link your Parchment user in Doctor Settings > Parchment Prescribing Account, or create the patient without immediate sync.",
        }
      }

      try {
        await validateIntegration(callerParchmentUserId)
      } catch (validationError) {
        log.warn(
          "Parchment integration validation failed before manual patient sync",
          {},
          validationError instanceof Error ? validationError : new Error(String(validationError)),
        )
        return {
          success: false,
          error: "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
        }
      }
    }

    const duplicatePatient = await findDuplicatePatient(supabase, input)
    if (duplicatePatient) {
      return {
        success: false,
        error: "A matching patient already exists. Open the existing profile instead of creating a duplicate.",
        duplicatePatient,
      }
    }

    const now = new Date().toISOString()
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert(encryptProfilePhi({
        ...validation.profile,
        created_at: now,
        updated_at: now,
      }))
      .select("id")
      .single()

    if (createError || !created?.id) {
      const insertFailure = createError as { code?: string; message?: string } | null
      const insertFailureMessage = insertFailure?.message || "Manual patient insert failed"
      log.error("Failed to create manual patient profile", {
        code: insertFailure?.code,
      }, new Error(insertFailureMessage))
      return { success: false, error: "Could not create the patient profile." }
    }

    await logAuditEvent({
      action: "profile_created",
      actorId: authResult.profile.id,
      actorType: actorTypeForRole(authResult.profile.role),
      metadata: {
        action_type: "manual_patient_create",
        patient_id: created.id,
        sync_requested: syncToParchment,
      },
    })

    let parchmentPatientId: string | undefined
    if (syncToParchment && callerParchmentUserId) {
      try {
        parchmentPatientId = await syncPatientToParchment(created.id, callerParchmentUserId)
      } catch (syncError) {
        log.warn("Manual patient created but Parchment sync failed", { patientId: created.id })
        Sentry.captureException(syncError, {
          extra: { context: "manual_patient_parchment_sync", patientId: created.id },
        })

        revalidateStaff({ patientId: created.id })

        return {
          success: true,
          patientId: created.id,
          syncedToParchment: false,
          warning: formatParchmentSyncError(syncError),
        }
      }
    }

    revalidateStaff({ patientId: created.id })

    return {
      success: true,
      patientId: created.id,
      parchmentPatientId,
      syncedToParchment: Boolean(parchmentPatientId),
    }
  } catch (error) {
    log.error("Unexpected manual patient creation failure", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "manual_patient_create" } })
    return { success: false, error: "Could not create the patient profile." }
  }
}

export async function getPatientParchmentPrescribeUrlAction(
  patientId: string,
): Promise<PatientParchmentPrescribeUrlActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient profile." }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:patient-sso:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment requests. Please wait and try again." }
  }

  const flags = await getFeatureFlags()
  if (!flags.parchment_embedded_prescribing) {
    return { success: false, error: "Embedded prescribing is not enabled." }
  }

  const prescribingCapability = checkParchmentPrescribingCapability({
    profile: authResult.profile,
  })
  if (!prescribingCapability.allowed) {
    log.warn("Patient profile Parchment prescribe blocked by doctor prescribing capability", {
      requiredCapability: prescribingCapability.requiredCapability,
    })
    return { success: false, error: prescribingCapability.error }
  }

  try {
    const supabase = createServiceRoleClient()
    const callerParchmentUserId = await getCallerParchmentUserId(supabase, authResult.profile.id)
    if (!callerParchmentUserId) {
      return {
        success: false,
        error: "Prescriber account not linked. Go to Doctor Settings > Parchment Prescribing Account to link your Parchment user.",
      }
    }

    const { data: patient } = await supabase
      .from("profiles")
      .select("id, role, merged_into_profile_id")
      .eq("id", patientId)
      .maybeSingle()

    if (!patient || patient.role !== "patient" || patient.merged_into_profile_id) {
      return { success: false, error: "Patient profile not found." }
    }

    const patientProfile = await getProfileById(patientId)
    if (!patientProfile) {
      return { success: false, error: "Patient profile not found." }
    }

    const identityIssues = getParchmentPatientIdentityIssues(patientProfile)
    if (identityIssues.length > 0) {
      return { success: false, error: `Missing prescribing details: ${identityIssues.join(", ")}` }
    }

    try {
      await validateIntegration(callerParchmentUserId)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before patient profile prescribing handoff",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return {
        success: false,
        error: "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
      }
    }

    const parchmentPatientId = await syncPatientToParchment(patientId, callerParchmentUserId)
    const ssoData = await getSsoUrl(
      callerParchmentUserId,
      `/embed/patients/${parchmentPatientId}/prescriptions`,
    )

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: actorTypeForRole(authResult.profile.role),
      metadata: {
        action_type: "patient_profile_parchment_prescribe_opened",
        patient_id: patientId,
      },
    })

    revalidateStaff({ patientId })

    return {
      success: true,
      ssoUrl: ssoData.redirect_url,
      parchmentPatientId,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      log.warn("Patient profile Parchment prescribe blocked by incomplete identity", {
        missingFields: error.issues,
      })
      return { success: false, error: `Missing prescribing details: ${error.issues.join(", ")}` }
    }

    if (error instanceof ParchmentPatientSyncError) {
      log.warn("Patient profile Parchment prescribe blocked by sync failure")
      Sentry.captureException(error, { extra: { context: "patient_profile_parchment_sync" } })
      return { success: false, error: "Parchment rejected the patient details. Check Medicare, address, DOB, phone, and sex; then retry." }
    }

    log.error("Failed to get patient profile Parchment URL", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "patient_profile_parchment_prescribe_url" } })
    return { success: false, error: "Failed to connect to Parchment. Please try again." }
  }
}

export async function syncPatientParchmentProfileAction(
  patientId: string,
): Promise<SyncPatientParchmentProfileActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient profile." }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:patient-profile-sync:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment sync attempts. Please wait and try again." }
  }

  const flags = await getFeatureFlags()
  if (!flags.parchment_embedded_prescribing) {
    return { success: false, error: "Embedded prescribing is not enabled." }
  }

  try {
    const supabase = createServiceRoleClient()
    const callerParchmentUserId = await getCallerParchmentUserId(supabase, authResult.profile.id)
    if (!callerParchmentUserId) {
      return {
        success: false,
        error: "Prescriber account not linked. Go to Doctor Settings > Parchment Prescribing Account to link your Parchment user.",
      }
    }

    const { data: patient } = await supabase
      .from("profiles")
      .select("id, role, merged_into_profile_id")
      .eq("id", patientId)
      .maybeSingle()

    if (!patient || patient.role !== "patient" || patient.merged_into_profile_id) {
      return { success: false, error: "Patient profile not found." }
    }

    try {
      await validateIntegration(callerParchmentUserId)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before patient profile sync",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return {
        success: false,
        error: "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
      }
    }

    const parchmentPatientId = await syncPatientToParchment(patientId, callerParchmentUserId)

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: actorTypeForRole(authResult.profile.role),
      metadata: {
        action_type: "patient_profile_parchment_sync",
        patient_id: patientId,
        parchment_patient_id: parchmentPatientId,
      },
    })

    revalidateStaff({ patientId })

    return {
      success: true,
      parchmentPatientId,
      syncedToParchment: true,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError || error instanceof ParchmentPatientSyncError) {
      return { success: false, error: formatParchmentSyncError(error) }
    }

    log.error("Failed to sync patient profile to Parchment", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "patient_profile_parchment_sync_action", patientId } })
    return { success: false, error: "Failed to sync patient to Parchment. Check integration status and try again." }
  }
}

export async function refreshPatientParchmentPrescriptionsAction(
  patientId: string,
): Promise<RefreshPatientParchmentPrescriptionsActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient profile." }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:patient-prescriptions-refresh:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment refresh attempts. Please wait and try again." }
  }

  const flags = await getFeatureFlags()
  if (!flags.parchment_embedded_prescribing) {
    return { success: false, error: "Embedded prescribing is not enabled." }
  }

  try {
    const supabase = createServiceRoleClient()
    const callerParchmentUserId = await getCallerParchmentUserId(supabase, authResult.profile.id)
    if (!callerParchmentUserId) {
      return {
        success: false,
        error: "Prescriber account not linked. Go to Doctor Settings > Parchment Prescribing Account to link your Parchment user.",
      }
    }

    const { data: patient } = await supabase
      .from("profiles")
      .select("id, role, merged_into_profile_id, parchment_patient_id")
      .eq("id", patientId)
      .maybeSingle()

    if (!patient || patient.role !== "patient" || patient.merged_into_profile_id) {
      return { success: false, error: "Patient profile not found." }
    }

    try {
      await validateIntegration(callerParchmentUserId)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before prescription refresh",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return {
        success: false,
        error: "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
      }
    }

    const parchmentPatientId = patient.parchment_patient_id
      || await syncPatientToParchment(patientId, callerParchmentUserId)

    const result = await syncParchmentPrescriptionListToPms({
      supabase,
      userId: callerParchmentUserId,
      parchmentPatientId,
      patientProfileId: patientId,
      prescriberProfileId: authResult.profile.id,
      intakeId: null,
      limit: 50,
      overwriteNullableLinks: false,
    })

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: actorTypeForRole(authResult.profile.role),
      metadata: {
        action_type: "patient_profile_parchment_prescriptions_refreshed",
        patient_id: patientId,
        parchment_patient_id: parchmentPatientId,
        synced_count: result.syncedCount,
        failed_count: result.failedCount,
        request_id: result.requestId,
      },
    })

    revalidateStaff({ patientId })

    return {
      success: result.success,
      error: result.success ? undefined : `Synced ${result.syncedCount} prescription(s), but ${result.failedCount} failed.`,
      parchmentPatientId,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      requestId: result.requestId,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError || error instanceof ParchmentPatientSyncError) {
      return { success: false, error: formatParchmentSyncError(error) }
    }

    log.error("Failed to refresh patient prescriptions from Parchment", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "patient_profile_parchment_prescriptions_refresh", patientId } })
    return { success: false, error: "Failed to refresh prescriptions from Parchment. Check integration status and try again." }
  }
}
