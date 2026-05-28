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
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import { normalizeValidIhiNumber } from "@/lib/validation/prescribing-identifier"
import type { AustralianState } from "@/types/db"

import { createPatient, ParchmentApiError, updatePatient } from "./client"
import type { CreatePatientRequest, UpdatePatientRequest } from "./types"

const log = createLogger("parchment-sync")
const AUSTRALIAN_STATES = new Set(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"])

type PatientProfile = NonNullable<Awaited<ReturnType<typeof getProfileById>>>

/** Throws - used as a never-returning expression in object literals where IIFE syntax fails */
function throwMissingDob(_profileId: string): never {
  throw new Error("Patient has no date_of_birth - cannot sync to Parchment")
}

/** Map InstantMed state abbreviations to Parchment format (same: NSW, VIC, etc.) */
function mapState(state: AustralianState | string | null): string | undefined {
  if (!state) return undefined
  // Parchment uses the same AU state abbreviations
  return state.toUpperCase()
}

function normalizePhone(phone: string | null): string | undefined {
  if (!phone) return undefined
  const normalized = phone.replace(/[\s()-]/g, "")
  return normalized || undefined
}

function normalizeDigits(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const normalized = String(value).replace(/\D/g, "")
  return normalized || undefined
}

function normalizeValidMedicareDigits(value: string | number | null | undefined): string | undefined {
  const normalized = normalizeDigits(value)
  if (!normalized) return undefined
  return validateMedicareNumber(normalized).valid ? normalized : undefined
}

function normalizeMedicareExpiry(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (isoMonth) {
    const month = Number.parseInt(isoMonth[2], 10)
    return month >= 1 && month <= 12 ? `${isoMonth[1]}-${isoMonth[2]}-01` : undefined
  }

  const short = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/)
  if (short) {
    const month = Number.parseInt(short[1], 10)
    const rawYear = short[2]
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}-01` : undefined
  }

  return undefined
}

export class ParchmentPatientIdentityError extends Error {
  constructor(readonly issues: string[]) {
    super(`Missing prescribing identity fields: ${issues.join(", ")}`)
    this.name = "ParchmentPatientIdentityError"
  }
}

export class ParchmentPatientSyncError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = "ParchmentPatientSyncError"
  }
}

function answerString(
  intakeAnswers: Record<string, unknown> | undefined,
  keys: string[],
): string | null {
  if (!intakeAnswers) return null
  for (const key of keys) {
    const value = intakeAnswers[key]
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function answerOrProfile(
  profileValue: string | number | null | undefined,
  intakeAnswers: Record<string, unknown> | undefined,
  answerKeys: string[],
): string | null {
  const profileString = profileValue === null || profileValue === undefined
    ? null
    : String(profileValue).trim()
  return answerString(intakeAnswers, answerKeys) || profileString || null
}

const ADDRESS_LINE1_ANSWER_KEYS = ["address_line1", "addressLine1", "address_line_1", "street_address"]
const ADDRESS_SUBURB_ANSWER_KEYS = ["suburb"]
const ADDRESS_STATE_ANSWER_KEYS = ["state"]
const ADDRESS_POSTCODE_ANSWER_KEYS = ["postcode"]
const ADDRESS_ANSWER_KEY_GROUPS = [
  ADDRESS_LINE1_ANSWER_KEYS,
  ADDRESS_SUBURB_ANSWER_KEYS,
  ADDRESS_STATE_ANSWER_KEYS,
  ADDRESS_POSTCODE_ANSWER_KEYS,
]

function hasAddressAnswer(intakeAnswers: Record<string, unknown> | undefined): boolean {
  return ADDRESS_ANSWER_KEY_GROUPS.some((keys) => answerString(intakeAnswers, keys) !== null)
}

function resolveParchmentAddressComponents(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): {
  addressLine1: string | null
  suburb: string | null
  state: string | undefined
  postcode: string | null
} {
  const useAnswerAddress = hasAddressAnswer(intakeAnswers)

  return {
    addressLine1: useAnswerAddress
      ? answerString(intakeAnswers, ADDRESS_LINE1_ANSWER_KEYS)
      : answerOrProfile(profile.address_line1, intakeAnswers, ADDRESS_LINE1_ANSWER_KEYS),
    suburb: useAnswerAddress
      ? answerString(intakeAnswers, ADDRESS_SUBURB_ANSWER_KEYS)
      : answerOrProfile(profile.suburb, intakeAnswers, ADDRESS_SUBURB_ANSWER_KEYS),
    state: mapState((useAnswerAddress
      ? answerString(intakeAnswers, ADDRESS_STATE_ANSWER_KEYS)
      : answerOrProfile(profile.state, intakeAnswers, ADDRESS_STATE_ANSWER_KEYS)) ?? null),
    postcode: useAnswerAddress
      ? answerString(intakeAnswers, ADDRESS_POSTCODE_ANSWER_KEYS)
      : answerOrProfile(profile.postcode, intakeAnswers, ADDRESS_POSTCODE_ANSWER_KEYS),
  }
}

function mapSex(rawSex: unknown): "M" | "F" | "N" | "I" {
  if (!rawSex) return "N"
  const value = String(rawSex).trim().toLowerCase()
  if (["m", "male"].includes(value)) return "M"
  if (["f", "female"].includes(value)) return "F"
  if (["i", "indeterminate", "intersex"].includes(value)) return "I"
  if (["n", "not_stated", "not stated", "prefer_not_to_say", "prefer not to say"].includes(value)) return "N"
  return "N"
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

function buildParchmentAddress(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): CreatePatientRequest["australian_street_address"] {
  const { addressLine1, suburb, state, postcode } = resolveParchmentAddressComponents(profile, intakeAnswers)
  const parsed = parseStreetAddress(addressLine1)

  if (!parsed.street_number && !parsed.street_name && !suburb && !state && !postcode) {
    return undefined
  }

  return {
    street_number: parsed.street_number,
    street_name: parsed.street_name,
    suburb: suburb || undefined,
    state,
    postcode: postcode || undefined,
  }
}

function splitFullName(fullName: string): { givenName: string; familyName: string } {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    givenName: nameParts[0] || "Unknown",
    familyName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Unknown",
  }
}

function resolveParchmentSex(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): "M" | "F" | "N" | "I" {
  return mapSex(answerOrProfile(profile.sex, intakeAnswers, ["sex", "gender"]))
}

function resolveDateOfBirth(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): string | null {
  return answerOrProfile(profile.date_of_birth, intakeAnswers, ["date_of_birth", "dateOfBirth", "dob"])
}

function resolveRawSex(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): string | null {
  return answerOrProfile(profile.sex, intakeAnswers, ["sex", "gender"])
}

export function getParchmentPatientIdentityIssues(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): string[] {
  const issues: string[] = []
  const dateOfBirth = resolveDateOfBirth(profile, intakeAnswers)
  const rawSex = resolveRawSex(profile, intakeAnswers)
  const phone = normalizePhone(answerOrProfile(profile.phone, intakeAnswers, ["phone", "mobile", "mobilePhone"]))
  const medicareNumber = normalizeDigits(answerOrProfile(profile.medicare_number, intakeAnswers, ["medicare_number", "medicareNumber"]))
  const medicareIrn = normalizeDigits(answerOrProfile(profile.medicare_irn, intakeAnswers, ["medicare_irn", "medicareIrn"]))
  const medicareExpiry = normalizeMedicareExpiry(answerOrProfile(profile.medicare_expiry, intakeAnswers, ["medicare_expiry", "medicareExpiry"]))
  const validIhi = normalizeValidIhiNumber(answerOrProfile(profile.ihi_number, intakeAnswers, ["ihi_number", "ihiNumber"]))
  const { addressLine1, suburb, state, postcode } = resolveParchmentAddressComponents(profile, intakeAnswers)

  if (!dateOfBirth) issues.push("DOB")
  if (!rawSex) issues.push("Sex")
  if (!phone) issues.push("Phone")
  if (!validIhi && !medicareNumber) {
    issues.push("Medicare or IHI")
  } else if (!validIhi && medicareNumber) {
    const medicare = validateMedicareNumber(medicareNumber)
    if (!medicare.valid) issues.push("Valid Medicare number")
    if (!medicareIrn || !/^[1-9]$/.test(medicareIrn)) issues.push("Medicare IRN")
    if (medicareExpiry) {
      const expiry = validateMedicareExpiry(medicareExpiry)
      if (!expiry.valid) issues.push("Valid Medicare expiry")
    }
  }
  if (!addressLine1) issues.push("Address street")
  if (!suburb) issues.push("Address suburb")
  if (!state || !AUSTRALIAN_STATES.has(state)) issues.push("Address state")
  if (!postcode || !/^\d{4}$/.test(postcode)) issues.push("Address postcode")

  return issues
}

export function buildCreatePatientRequest(
  profile: PatientProfile,
  patientProfileId: string,
  intakeAnswers?: Record<string, unknown>,
): CreatePatientRequest {
  const { givenName, familyName } = splitFullName(profile.full_name)
  const address = buildParchmentAddress(profile, intakeAnswers)
  const email = answerOrProfile(profile.email, intakeAnswers, ["email"])
  const phone = normalizePhone(answerOrProfile(profile.phone, intakeAnswers, ["phone", "mobile", "mobilePhone"]))
  const medicareNumber = answerOrProfile(profile.medicare_number, intakeAnswers, ["medicare_number", "medicareNumber"])
  const medicareIrn = answerOrProfile(profile.medicare_irn, intakeAnswers, ["medicare_irn", "medicareIrn"])
  const validMedicareNumber = normalizeValidMedicareDigits(medicareNumber)
  const medicareExpiry = normalizeMedicareExpiry(answerOrProfile(profile.medicare_expiry, intakeAnswers, ["medicare_expiry", "medicareExpiry"]))
  const validIhi = normalizeValidIhiNumber(answerOrProfile(profile.ihi_number, intakeAnswers, ["ihi_number", "ihiNumber"]))
  const dateOfBirth = resolveDateOfBirth(profile, intakeAnswers)

  return {
    family_name: familyName,
    given_name: givenName,
    date_of_birth: dateOfBirth ?? throwMissingDob(patientProfileId),
    sex: resolveParchmentSex(profile, intakeAnswers),
    partner_patient_id: patientProfileId, // Our profile.id - used for webhook matching
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(validMedicareNumber ? { medicare_card_number: validMedicareNumber } : {}),
    ...(validMedicareNumber && normalizeDigits(medicareIrn) ? { medicare_irn: normalizeDigits(medicareIrn) } : {}),
    ...(validMedicareNumber && medicareExpiry ? { medicare_valid_to: medicareExpiry } : {}),
    ...(validIhi ? { ihi_number: validIhi } : {}),
    ...(address ? { australian_street_address: address } : {}),
  }
}

export function buildUpdatePatientRequest(
  profile: PatientProfile,
  intakeAnswers?: Record<string, unknown>,
): UpdatePatientRequest {
  const { givenName, familyName } = splitFullName(profile.full_name)
  const address = buildParchmentAddress(profile, intakeAnswers)
  const email = answerOrProfile(profile.email, intakeAnswers, ["email"])
  const phone = normalizePhone(answerOrProfile(profile.phone, intakeAnswers, ["phone", "mobile", "mobilePhone"]))
  const medicareNumber = answerOrProfile(profile.medicare_number, intakeAnswers, ["medicare_number", "medicareNumber"])
  const medicareIrn = answerOrProfile(profile.medicare_irn, intakeAnswers, ["medicare_irn", "medicareIrn"])
  const validMedicareNumber = normalizeValidMedicareDigits(medicareNumber)
  const medicareExpiry = normalizeMedicareExpiry(answerOrProfile(profile.medicare_expiry, intakeAnswers, ["medicare_expiry", "medicareExpiry"]))
  const validIhi = normalizeValidIhiNumber(answerOrProfile(profile.ihi_number, intakeAnswers, ["ihi_number", "ihiNumber"]))
  const dateOfBirth = resolveDateOfBirth(profile, intakeAnswers)

  return {
    family_name: familyName,
    given_name: givenName,
    ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
    sex: resolveParchmentSex(profile, intakeAnswers),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(validMedicareNumber ? { medicare_card_number: validMedicareNumber } : {}),
    ...(validMedicareNumber && normalizeDigits(medicareIrn) ? { medicare_irn: normalizeDigits(medicareIrn) } : {}),
    ...(validMedicareNumber && medicareExpiry ? { medicare_valid_to: medicareExpiry } : {}),
    ...(validIhi ? { ihi_number: validIhi } : {}),
    ...(address ? { australian_address: address } : {}),
  }
}

/**
 * Ensure a patient exists in Parchment. Returns the parchment_patient_id.
 *
 * - If the patient already has a `parchment_patient_id`, refreshes the
 *   demographics/contact details in Parchment, then returns it.
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

  // Check if already synced.
  const { data: existing } = await supabase
    .from("profiles")
    .select("parchment_patient_id")
    .eq("id", patientProfileId)
    .single()

  const profile = await getProfileById(patientProfileId)
  if (!profile) {
    throw new Error("Patient profile not found")
  }

  const identityIssues = getParchmentPatientIdentityIssues(profile, intakeAnswers)
  if (identityIssues.length > 0) {
    throw new ParchmentPatientIdentityError(identityIssues)
  }

  const sexFromAnswers = mapSex(intakeAnswers?.sex || intakeAnswers?.gender)
  if (!profile.sex && sexFromAnswers !== "N") {
    await supabase
      .from("profiles")
      .update({ sex: sexFromAnswers, updated_at: new Date().toISOString() })
      .eq("id", patientProfileId)
  }

  let staleParchmentPatientId: string | null = null

  if (existing?.parchment_patient_id) {
    try {
      await updatePatient(
        prescriberParchmentUserId,
        existing.parchment_patient_id,
        buildUpdatePatientRequest(profile, intakeAnswers),
      )
    } catch (error) {
      if (error instanceof ParchmentApiError && error.status === 404) {
        const { error: clearError } = await supabase
          .from("profiles")
          .update({
            parchment_patient_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", patientProfileId)
          .eq("parchment_patient_id", existing.parchment_patient_id)

        if (clearError) {
          log.error(
            "Failed to clear stale parchment_patient_id on profile",
            {},
            clearError instanceof Error ? clearError : new Error(String(clearError)),
          )
          throw new ParchmentPatientSyncError("Failed to clear stale patient mapping", clearError)
        }

        log.warn("Stored Parchment patient ID was stale; recreating patient")
        staleParchmentPatientId = existing.parchment_patient_id
      } else {
        // Conformance requires the PMS update flow to actually update Parchment.
        // Continuing here can put the doctor on stale demographics.
        log.warn("Patient refresh in Parchment failed; blocking prescribing")
        Sentry.captureException(error, {
          extra: {
            context: "parchment_patient_refresh",
          },
        })
        throw new ParchmentPatientSyncError("Failed to refresh patient details in Parchment", error)
      }
    }

    if (!staleParchmentPatientId) {
      log.info("Patient already synced to Parchment; using existing record")
      return existing.parchment_patient_id
    }
  }

  const patientData = buildCreatePatientRequest(profile, patientProfileId, intakeAnswers)

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
      log.error("Failed to save parchment_patient_id on profile", {}, updateError instanceof Error ? updateError : new Error(String(updateError)))
      Sentry.captureException(updateError, {
        extra: { context: "parchment_patient_id_profile_update" },
      })
    }

    // Re-read in case another concurrent call won the race
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("parchment_patient_id")
      .eq("id", patientProfileId)
      .single()

    const finalId = refreshed?.parchment_patient_id || result.parchment_patient_id

    log.info("Patient synced to Parchment")

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
      log.info("Patient already synced (concurrent race resolved)")
      return fallback.parchment_patient_id
    }

    log.error("Failed to sync patient to Parchment", {}, error instanceof Error ? error : new Error(String(error)))
    throw new ParchmentPatientSyncError("Failed to sync patient details to Parchment", error)
  }
}
