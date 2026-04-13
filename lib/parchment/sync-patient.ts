/**
 * Parchment Patient Sync
 *
 * Syncs an InstantMed patient profile to Parchment when a doctor
 * initiates prescribing. Idempotent - skips if already synced.
 */

import "server-only"

import * as Sentry from "@sentry/nextjs"

import { getProfileById } from "@/lib/data/profiles"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { AustralianState } from "@/types/db"

import { createPatient } from "./client"
import type { CreatePatientRequest } from "./types"

const log = createLogger("parchment-sync")

/** Throws - used as a never-returning expression in object literals where IIFE syntax fails */
function throwMissingDob(profileId: string): never {
  throw new Error(`Patient ${profileId} has no date_of_birth - cannot sync to Parchment`)
}

/** Map InstantMed state abbreviations to Parchment format (same: NSW, VIC, etc.) */
function mapState(state: AustralianState | string | null): string | undefined {
  if (!state) return undefined
  // Parchment uses the same AU state abbreviations
  return state.toUpperCase()
}

/**
 * Parse street number from address line 1.
 *
 * Australian addresses typically look like:
 *   "1 Main Street"
 *   "12/34 Smith Road"          → street_number: "12/34"
 *   "Unit 5, 22 King Street"    → street_number: "5/22"   (normalise to slash)
 *   "Level 1/457-459 Elizabeth Street" → street_number: "1/457-459"
 *
 * Parchment requires `street_number` and `street_name` as separate fields.
 * If we can't parse a number, we put everything in `street_name` and leave
 * `street_number` undefined - Parchment may still reject, but this handles
 * the common 95% case.
 */
function parseStreetAddress(addressLine1: string | null): {
  street_number?: string
  street_name?: string
} {
  if (!addressLine1) return {}

  const trimmed = addressLine1.trim()

  // Try: "Unit X, Y Street Name" or "Apt X, Y Street Name"
  const unitCommaMatch = trimmed.match(
    /^(?:unit|apt|suite|lot|level)\s+(\S+)\s*,\s*(\d[\d/a-zA-Z-]*)\s+(.+)$/i
  )
  if (unitCommaMatch) {
    return {
      street_number: `${unitCommaMatch[1]}/${unitCommaMatch[2]}`,
      street_name: unitCommaMatch[3],
    }
  }

  // Try: "Level 1/457 Elizabeth Street" - keyword + number(s) + street (no comma)
  const keywordNoCommaMatch = trimmed.match(
    /^(?:unit|apt|suite|lot|level)\s+(\d[\d/a-zA-Z-]*)\s+(.+)$/i
  )
  if (keywordNoCommaMatch) {
    return {
      street_number: keywordNoCommaMatch[1],
      street_name: keywordNoCommaMatch[2],
    }
  }

  // Try: leading number(s) possibly with slash/dash (e.g. "12/34", "457-459", "1A")
  const numberMatch = trimmed.match(/^(\d[\d/a-zA-Z-]*)\s+(.+)$/)
  if (numberMatch) {
    return {
      street_number: numberMatch[1],
      street_name: numberMatch[2],
    }
  }

  // Fallback: can't parse - put everything in street_name
  return { street_name: trimmed }
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

  // Map sex from profile (M/F/N/I) - fall back to intake answers, then "N" (not stated)
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
    date_of_birth: profile.date_of_birth ?? throwMissingDob(patientProfileId),
    sex: parchmentSex,
    partner_patient_id: patientProfileId, // Our profile.id - used for webhook matching
    // Optional fields
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.phone ? { phone: profile.phone } : {}),
    ...(profile.medicare_number ? { medicare_card_number: profile.medicare_number } : {}),
    ...(profile.medicare_irn ? { medicare_irn: String(profile.medicare_irn) } : {}),
    ...(profile.medicare_expiry ? { medicare_valid_to: profile.medicare_expiry } : {}),
    // Address - Parchment requires street_number + street_name as separate fields
    ...((profile.address_line1 || profile.suburb) ? {
      australian_street_address: {
        ...parseStreetAddress(profile.address_line1),
        suburb: profile.suburb || undefined,
        state: mapState(profile.state),
        postcode: profile.postcode || undefined,
      },
    } : {}),
  }

  try {
    const result = await createPatient(prescriberParchmentUserId, patientData)

    // Save parchment_patient_id on profile - use conditional update to handle TOCTOU race.
    // If two concurrent calls both created the patient in Parchment, the first writer wins.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        parchment_patient_id: result.parchment_patient_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patientProfileId)
      .is("parchment_patient_id", null) // Only write if not already set

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

    // Re-read in case another concurrent call won the race
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("parchment_patient_id")
      .eq("id", patientProfileId)
      .single()

    const finalId = refreshed?.parchment_patient_id || result.parchment_patient_id

    log.info("Patient synced to Parchment", {
      patientProfileId,
      parchmentPatientId: finalId,
    })

    return finalId
  } catch (error) {
    // If Parchment rejected the create because partner_patient_id already exists,
    // another concurrent call may have succeeded - re-check the profile.
    const { data: fallback } = await supabase
      .from("profiles")
      .select("parchment_patient_id")
      .eq("id", patientProfileId)
      .single()

    if (fallback?.parchment_patient_id) {
      log.info("Patient already synced (concurrent race resolved)", {
        patientProfileId,
        parchmentPatientId: fallback.parchment_patient_id,
      })
      return fallback.parchment_patient_id
    }

    log.error("Failed to sync patient to Parchment", { patientProfileId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}
