import "server-only"

import {
  CODEINE_REPEAT_WINDOW_DAYS,
  type CodeineRepeatWindowResult,
  evaluateCodeineRepeatWindow,
  toSydneyCalendarDate,
} from "@/lib/clinical/codeine-repeat-window"
import { isCodeineCombinationMedication } from "@/lib/clinical/controlled-substances"
import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Recent codeine-script lookup for the pre-payment repeat gate.
 *
 * `prescriptions.medication_name` is plaintext, so the codeine-class regex
 * runs server-side over the patient's issued scripts. Fail-soft: a lookup
 * error opens the gate (the doctor still reviews and can decline), it never
 * blocks care on an infrastructure blip and never throws into checkout.
 */

const logger = createLogger("recent-codeine-script")

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

const RECENT_SCRIPT_STATUSES = ["active", "completed"] as const

function calendarDateDaysAgo(now: Date, days: number): string {
  const today = toSydneyCalendarDate(now)
  const [year, month, day] = today.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10)
}

export async function findRecentCodeineScript(
  supabase: SupabaseClient,
  params: { patientIds: ReadonlyArray<string>; now?: Date },
): Promise<CodeineRepeatWindowResult | null> {
  const patientIds = [...new Set(params.patientIds.filter(Boolean))]
  if (patientIds.length === 0) return null
  const now = params.now ?? new Date()

  const { data, error } = await supabase
    .from("prescriptions")
    .select("patient_id, medication_name, status, issued_date")
    .in("patient_id", patientIds)
    .in("status", [...RECENT_SCRIPT_STATUSES])
    .gte("issued_date", calendarDateDaysAgo(now, CODEINE_REPEAT_WINDOW_DAYS))
    .order("issued_date", { ascending: false })
    .limit(50)

  if (error) {
    logger.warn("Recent codeine-script lookup failed, opening the gate", { error: error.message })
    return null
  }

  const issuedDates = (data ?? [])
    .filter((row) => typeof row.medication_name === "string" && isCodeineCombinationMedication(row.medication_name))
    .map((row) => String(row.issued_date))
  const window = evaluateCodeineRepeatWindow({ issuedDates, now })
  return window.withinWindow ? window : null
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Guest checkouts have no session, so the gate keys on the identity the guest
 * typed: the normalised email, plus any other open patient profile with the
 * same name and date of birth (the same fields the duplicate-profile check
 * uses). Merged and closed profiles are excluded. Returns [] on any failure.
 */
export async function resolveGuestPatientIdsForRecency(
  supabase: SupabaseClient,
  params: { email: string | null | undefined; fullName: string | null | undefined; dateOfBirth: string | null | undefined },
): Promise<string[]> {
  const ids = new Set<string>()
  const email = (params.email ?? "").trim().toLowerCase()
  const name = normalizeName(params.fullName)
  const dateOfBirth = (params.dateOfBirth ?? "").trim().slice(0, 10)

  try {
    if (email) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, merged_into_profile_id, account_closed_at")
        .eq("role", "patient")
        .is("merged_into_profile_id", null)
        .is("account_closed_at", null)
        .eq("email", email)
        .limit(20)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) if (typeof row.id === "string") ids.add(row.id)
    }
    if (name && dateOfBirth) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, merged_into_profile_id, account_closed_at")
        .eq("role", "patient")
        .is("merged_into_profile_id", null)
        .is("account_closed_at", null)
        .eq("date_of_birth", dateOfBirth)
        .limit(50)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        if (typeof row.id === "string" && normalizeName(row.full_name as string | null) === name) ids.add(row.id)
      }
    }
  } catch (error) {
    logger.warn("Guest identity lookup for the codeine gate failed, opening the gate", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return []
  }
  return [...ids]
}
