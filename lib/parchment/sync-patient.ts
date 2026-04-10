/**
 * Parchment Patient Sync
 *
 * Syncs an InstantMed patient profile to Parchment when a doctor
 * initiates prescribing. Idempotent — skips if already synced.
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getProfileById } from "@/lib/data/profiles"
import { createPatient } from "./client"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import type { CreatePatientRequest } from "./types"
import type { AustralianState } from "@/types/db"

const log = createLogger("parchment-sync")

/** Map InstantMed state abbreviations to Parchment format (same: NSW, VIC, etc.) */
function mapState(state: AustralianState | string | null): string | undefined {
  if (!state) return undefined
  // Parchment uses the same AU state abbreviations
  return state.toUpperCase()
}

/**
 * Ensure a patient exists in Parchment. Returns the parchment_patient_id.
 *
 * - If the patient already has a `parchment_patient_id`, returns it immediately.
 * - Otherwise, creates the patient via the Parchment API using the prescriber's user_id,
 *   saves the returned ID on the profile, and returns it.
 *
 * @param patientProfileId - InstantMed profile.id of the patient
 * @param prescriberParchmentUserId - Parchment user_id of the prescribing doctor
 * @param intakeAnswers - Optional intake answers blob to get sex if not on profile
 */
export async function syncPatientToParchment(
  patientProfileId: string,
  prescriberParchmentUserId: string,
  intakeAnswers?: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceRoleClient()

  // Check if already synced (fast path)
  const { data: existing } = await supabase
    .from("profiles")
    .select("parchment_patient_id")
    .eq("id", patientProfileId)
    .single()

  if (existing?.parchment_patient_id) {
    log.info("Patient already synced to Parchment", {
      patientProfileId,
      parchmentPatientId: existing.parchment_patient_id,
    })
    return existing.parchment_patient_id
  }

  // Fetch full profile for Parchment patient creation
  const profile = await getProfileById(patientProfileId)
  if (!profile) {
    throw new Error(`Patient profile not found: ${patientProfileId}`)
  }

  // Split full_name into given/family names
  const nameParts = profile.full_name.trim().split(/\s+/)
  const givenName = nameParts[0] || "Unknown"
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Unknown"

  // Map sex from profile (M/F/N/I) — fall back to intake answers, then "N" (not stated)
  const sexFromProfile = profile.sex
  const sexFromAnswers = intakeAnswers?.sex as string | undefined
  const rawSex = sexFromProfile || sexFromAnswers
  const parchmentSex = (rawSex && ["M", "F", "N", "I"].includes(rawSex))
    ? rawSex as "M" | "F" | "N" | "I"
    : "N"

  // If we got sex from answers but it's missing from profile, save it
  if (!sexFromProfile && sexFromAnswers && ["M", "F", "N", "I"].includes(sexFromAnswers)) {
    await supabase
      .from("profiles")
      .update({ sex: sexFromAnswers, updated_at: new Date().toISOString() })
      .eq("id", patientProfileId)
  }

  // Build Parchment patient request
  const patientData: CreatePatientRequest = {
    family_name: familyName,
    given_name: givenName,
    date_of_birth: profile.date_of_birth || "1900-01-01", // Required — fallback should not happen in practice
    sex: parchmentSex,
    partner_patient_id: patientProfileId, // Our profile.id — used for webhook matching
    // Optional fields
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.phone ? { phone: profile.phone } : {}),
    ...(profile.medicare_number ? { medicare_card_number: profile.medicare_number } : {}),
    ...(profile.medicare_irn ? { medicare_irn: String(profile.medicare_irn) } : {}),
    ...(profile.medicare_expiry ? { medicare_valid_to: profile.medicare_expiry } : {}),
    // Address
    ...((profile.address_line1 || profile.suburb) ? {
      australian_street_address: {
        street_name: profile.address_line1 || undefined,
        suburb: profile.suburb || undefined,
        state: mapState(profile.state),
        postcode: profile.postcode || undefined,
      },
    } : {}),
  }

  try {
    const result = await createPatient(prescriberParchmentUserId, patientData)

    // Save parchment_patient_id on profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        parchment_patient_id: result.parchment_patient_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patientProfileId)

    if (updateError) {
      // Patient was created in Parchment but we couldn't save the ID.
      // Log the mapping so it can be manually reconciled.
      log.error("Failed to save parchment_patient_id on profile", {
        patientProfileId,
        parchmentPatientId: result.parchment_patient_id,
      }, updateError instanceof Error ? updateError : new Error(String(updateError)))
      Sentry.captureException(updateError, {
        extra: { patientProfileId, parchmentPatientId: result.parchment_patient_id },
      })
    }

    log.info("Patient synced to Parchment", {
      patientProfileId,
      parchmentPatientId: result.parchment_patient_id,
    })

    return result.parchment_patient_id
  } catch (error) {
    log.error("Failed to sync patient to Parchment", { patientProfileId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}
