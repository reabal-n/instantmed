import "server-only"

import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Same-name + same-DOB duplicate-profile detection.
 *
 * A patient who re-enters under a fresh email gets a NEW profile with a new
 * `patient_id`. Every patient-scoped safety check (the med-cert
 * repeat-within-7d guard, renewal detection, prior-approval trust) keys on
 * `patient_id`, so the new profile reads as a clean first-time patient and
 * med-cert auto-approval would silently issue a second certificate — the exact
 * loophole seen on 2026-07-06 (same person, two emails, same DOB).
 *
 * This matches on the two identity fields a patient cannot casually change and
 * that are stored in plaintext on `profiles` (name + DOB; no decryption needed):
 * exact date_of_birth (selective, indexed) plus a normalized full-name compare.
 * A hit is an ATTENTION-severity signal — never an automated decision. It routes
 * the med-cert to a doctor (deterministic needs_doctor) so a human sees the
 * prior history and decides; it does not decline or approve anything itself.
 *
 * Fail-soft: any query error returns "no duplicate" so detection can never block
 * or crash the auto-approval pipeline. Missing a duplicate is recoverable (the
 * doctor still has the timeline); crashing the pipeline is not.
 */

const logger = createLogger("duplicate-patient-detection")

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

export interface DuplicatePatientMatch {
  /** The other profile that shares this patient's name + DOB. */
  matchedProfileId: string
}

/** Lowercase, trim, and collapse internal whitespace for a stable name compare. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Find a DIFFERENT profile that shares this patient's normalized full name and
 * exact date of birth. Returns the first match, or null when there is none / the
 * inputs are incomplete / the lookup fails.
 */
export async function findDuplicatePatientProfile(
  supabase: SupabaseClient,
  params: { patientId: string; fullName: string | null; dateOfBirth: string | null },
): Promise<DuplicatePatientMatch | null> {
  const { patientId, fullName, dateOfBirth } = params

  const normalizedTarget = fullName ? normalizeName(fullName) : ""
  if (!patientId || !normalizedTarget || !dateOfBirth) return null

  // DOB is the selective filter (few people share an exact DOB); the name
  // compare is done in JS because the column is not normalized in the DB. The
  // limit caps a pathological shared-DOB scan without changing the common case.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("date_of_birth", dateOfBirth)
    .neq("id", patientId)
    .limit(50)

  if (error) {
    logger.warn("Duplicate-patient lookup failed, treating as no duplicate", {
      patientId,
      error: error.message,
    })
    return null
  }

  const match = (data ?? []).find(
    (row) => row.full_name && normalizeName(row.full_name) === normalizedTarget,
  )

  return match ? { matchedProfileId: match.id } : null
}
