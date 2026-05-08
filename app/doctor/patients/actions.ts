"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import {
  type DoctorPatientCreateFieldErrors,
  type DoctorPatientCreateInput,
  validateDoctorPatientCreateInput,
} from "@/lib/doctor/doctor-patient-create"
import { createLogger } from "@/lib/observability/logger"
import { getSsoUrl, validateIntegration } from "@/lib/parchment/client"
import {
  ParchmentPatientIdentityError,
  ParchmentPatientSyncError,
  syncPatientToParchment,
} from "@/lib/parchment/sync-patient"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { encryptField } from "@/lib/security/encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const log = createLogger("doctor-patient-create")

export interface DoctorPatientParchmentActionResult {
  success: boolean
  error?: string
  fieldErrors?: DoctorPatientCreateFieldErrors
  patientId?: string
  parchmentPatientId?: string
  ssoUrl?: string
}

function encryptedProfileFields(input: {
  date_of_birth?: string | null
  phone?: string | null
  medicare_number?: string | null
}): {
  date_of_birth_encrypted?: string
  phone_encrypted?: string
  medicare_number_encrypted?: string
  phi_encrypted_at?: string
} {
  if (!process.env.ENCRYPTION_KEY) return {}

  const encrypted = {
    ...(input.date_of_birth ? { date_of_birth_encrypted: encryptField(input.date_of_birth) } : {}),
    ...(input.phone ? { phone_encrypted: encryptField(input.phone) } : {}),
    ...(input.medicare_number ? { medicare_number_encrypted: encryptField(input.medicare_number) } : {}),
  }

  return Object.keys(encrypted).length > 0
    ? { ...encrypted, phi_encrypted_at: new Date().toISOString() }
    : {}
}

function patientSavedButParchmentFailed(patientId: string, error: unknown): DoctorPatientParchmentActionResult {
  if (error instanceof ParchmentPatientIdentityError) {
    return {
      success: false,
      patientId,
      error: `Patient saved, but Parchment sync is missing: ${error.issues.join(", ")}.`,
    }
  }

  if (error instanceof ParchmentPatientSyncError) {
    return {
      success: false,
      patientId,
      error: "Patient saved, but Parchment did not accept the sync. Open the patient record and retry.",
    }
  }

  return {
    success: false,
    patientId,
    error: "Patient saved, but Parchment could not be opened. Open the patient record and retry.",
  }
}

function parchmentValidationFailure(patientId?: string): DoctorPatientParchmentActionResult {
  return {
    success: false,
    ...(patientId ? { patientId } : {}),
    error: patientId
      ? "Patient saved, but Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry."
      : "Parchment integration validation failed. Revalidate the Parchment account in Doctor Settings and retry.",
  }
}

export async function createDoctorPatientAndOpenParchmentAction(
  input: DoctorPatientCreateInput,
): Promise<DoctorPatientParchmentActionResult> {
  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`doctor:add-patient:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many patient create attempts. Please wait and try again." }
  }

  const validation = validateDoctorPatientCreateInput(input)
  if (!validation.valid || !validation.value) {
    return {
      success: false,
      error: "Check the highlighted patient details.",
      fieldErrors: validation.fieldErrors,
    }
  }

  const supabase = createServiceRoleClient()

  const { data: doctorProfile } = await supabase
    .from("profiles")
    .select("parchment_user_id")
    .eq("id", authResult.profile.id)
    .single()

  if (!doctorProfile?.parchment_user_id) {
    return {
      success: false,
      error: "Parchment account not linked. Go to Settings -> Identity and link your Parchment user first.",
    }
  }

  const { data: existingPatient } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", validation.value.email)
    .eq("role", "patient")
    .maybeSingle()

  if (existingPatient?.id) {
    return {
      success: false,
      fieldErrors: { email: "A patient with this email already exists." },
      error: "A patient with this email already exists. Open that patient instead.",
    }
  }

  const now = new Date().toISOString()
  const profileUpdates = validation.value.profileUpdates
  const insertPayload = {
    auth_user_id: null,
    email: validation.value.email,
    full_name: validation.value.fullName,
    first_name: validation.value.firstName,
    last_name: validation.value.lastName,
    role: "patient",
    onboarding_completed: true,
    email_verified: false,
    email_verified_at: null,
    consent_myhr: false,
    ...profileUpdates,
    ...encryptedProfileFields(profileUpdates),
    created_at: now,
    updated_at: now,
  }

  const { data: patient, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("id")
    .single()

  if (insertError || !patient?.id) {
    if (insertError?.code === "23505") {
      return {
        success: false,
        fieldErrors: { email: "A patient with this email already exists." },
        error: "A patient with this email already exists. Open that patient instead.",
      }
    }

    log.error("Failed to create doctor-entered patient", {
      code: insertError?.code,
    }, insertError instanceof Error ? insertError : new Error(String(insertError)))
    return { success: false, error: "Failed to create patient. Please try again." }
  }

  try {
    try {
      await validateIntegration(doctorProfile.parchment_user_id)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before doctor-entered patient handoff",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return parchmentValidationFailure(patient.id)
    }

    const parchmentPatientId = await syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)
    const ssoData = await getSsoUrl(
      doctorProfile.parchment_user_id,
      `/embed/patients/${parchmentPatientId}/prescriptions`,
    )

    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${patient.id}`)

    return {
      success: true,
      patientId: patient.id,
      parchmentPatientId,
      ssoUrl: ssoData.redirect_url,
    }
  } catch (error) {
    log.warn("Doctor-entered patient could not be opened in Parchment", {
      patientCreated: true,
    })
    Sentry.captureException(error, { extra: { context: "doctor_add_patient_parchment_sync" } })
    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${patient.id}`)
    return patientSavedButParchmentFailed(patient.id, error)
  }
}

export async function openPatientInParchmentAction(
  patientId: string,
): Promise<DoctorPatientParchmentActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient ID" }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`doctor:open-patient-parchment:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment attempts. Please wait and try again." }
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
        error: "Parchment account not linked. Go to Settings -> Identity and link your Parchment user first.",
      }
    }

    const { data: patient } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", patientId)
      .eq("role", "patient")
      .is("merged_into_profile_id", null)
      .single()

    if (!patient?.id) {
      return { success: false, error: "Patient not found" }
    }

    try {
      await validateIntegration(doctorProfile.parchment_user_id)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before existing patient handoff",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return parchmentValidationFailure(patient.id)
    }

    const parchmentPatientId = await syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)
    const ssoData = await getSsoUrl(
      doctorProfile.parchment_user_id,
      `/embed/patients/${parchmentPatientId}/prescriptions`,
    )

    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${patient.id}`)

    return {
      success: true,
      patientId: patient.id,
      parchmentPatientId,
      ssoUrl: ssoData.redirect_url,
    }
  } catch (error) {
    if (error instanceof ParchmentPatientIdentityError) {
      return { success: false, error: `Missing prescribing details: ${error.issues.join(", ")}` }
    }

    log.warn("Failed to open patient in Parchment")
    Sentry.captureException(error, { extra: { context: "doctor_open_patient_parchment" } })
    return { success: false, error: "Failed to connect to Parchment. Check patient details and retry." }
  }
}

export async function updateDoctorPatientAndSyncParchmentAction(
  patientId: string,
  input: DoctorPatientCreateInput,
): Promise<DoctorPatientParchmentActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient ID" }
  }

  const authResult = await requireRoleOrNull(["doctor", "admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`doctor:update-patient:${authResult.profile.id}`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many patient update attempts. Please wait and try again." }
  }

  const validation = validateDoctorPatientCreateInput(input)
  if (!validation.valid || !validation.value) {
    return {
      success: false,
      error: "Check the highlighted patient details.",
      fieldErrors: validation.fieldErrors,
    }
  }

  const supabase = createServiceRoleClient()

  const { data: doctorProfile } = await supabase
    .from("profiles")
    .select("parchment_user_id")
    .eq("id", authResult.profile.id)
    .single()

  if (!doctorProfile?.parchment_user_id) {
    return {
      success: false,
      error: "Parchment account not linked. Go to Settings -> Identity and link your Parchment user first.",
    }
  }

  const { data: existingPatient } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", patientId)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .single()

  if (!existingPatient?.id) {
    return { success: false, error: "Patient not found" }
  }

  const { data: emailConflict } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", validation.value.email)
    .eq("role", "patient")
    .neq("id", patientId)
    .maybeSingle()

  if (emailConflict?.id) {
    return {
      success: false,
      fieldErrors: { email: "A different patient already uses this email." },
      error: "A different patient already uses this email.",
    }
  }

  const profileUpdates = validation.value.profileUpdates
  const emailChanged = existingPatient.email !== validation.value.email
  const updatePayload = {
    email: validation.value.email,
    full_name: validation.value.fullName,
    first_name: validation.value.firstName,
    last_name: validation.value.lastName,
    onboarding_completed: true,
    ...profileUpdates,
    medicare_expiry: profileUpdates.medicare_expiry ?? null,
    ...(emailChanged ? { email_verified: false, email_verified_at: null } : {}),
    ...encryptedProfileFields(profileUpdates),
    updated_at: new Date().toISOString(),
  }

  const { data: patient, error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", patientId)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .select("id")
    .single()

  if (updateError || !patient?.id) {
    if (updateError?.code === "23505") {
      return {
        success: false,
        fieldErrors: { email: "A different patient already uses this email." },
        error: "A different patient already uses this email.",
      }
    }

    log.error("Failed to update doctor-managed patient", {
      code: updateError?.code,
    }, updateError instanceof Error ? updateError : new Error(String(updateError)))
    return { success: false, error: "Failed to update patient. Please try again." }
  }

  try {
    try {
      await validateIntegration(doctorProfile.parchment_user_id)
    } catch (validationError) {
      log.warn(
        "Parchment integration validation failed before doctor-managed patient sync",
        {},
        validationError instanceof Error ? validationError : new Error(String(validationError)),
      )
      return parchmentValidationFailure(patient.id)
    }

    const parchmentPatientId = await syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)

    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${patient.id}`)

    return {
      success: true,
      patientId: patient.id,
      parchmentPatientId,
    }
  } catch (error) {
    log.warn("Doctor-managed patient could not be resynced to Parchment", {
      patientUpdated: true,
    })
    Sentry.captureException(error, { extra: { context: "doctor_update_patient_parchment_sync" } })
    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${patient.id}`)
    return patientSavedButParchmentFailed(patient.id, error)
  }
}
