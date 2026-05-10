import "server-only"

import { decryptProfilePhi } from "@/lib/data/profiles"
import { collapseDuplicatePatientProfiles } from "@/lib/doctor/patient-snapshot"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile, type Profile } from "@/types/db"

const log = createLogger("patient-directory")

export type PatientDirectoryProfile = Profile & {
  duplicate_profile_ids?: string[]
}

export interface PatientDirectoryPage {
  patients: PatientDirectoryProfile[]
  total: number
  rawTotal: number
  collapsedCount: number
}

export async function getPatientDirectoryPage({
  page,
  pageSize = 50,
}: {
  page: number
  pageSize?: number
}): Promise<PatientDirectoryPage> {
  const supabase = createServiceRoleClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      parchment_patient_id,
      onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, parchment_patient_id,
      merged_into_profile_id, merged_at, merged_by, merge_reason,
      created_at, updated_at
    `, { count: "exact" })
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch patient directory", { error: error.message, page: from })
    return { patients: [], total: 0, rawTotal: 0, collapsedCount: 0 }
  }

  const rawPatients = (data || []).map((row) =>
    asProfile(decryptProfilePhi(row as Record<string, unknown>)),
  )
  const collapsed = collapseDuplicatePatientProfiles(rawPatients)

  return {
    patients: collapsed.patients.slice(from, to + 1),
    total: collapsed.patients.length,
    rawTotal: count ?? rawPatients.length,
    collapsedCount: collapsed.collapsedCount,
  }
}
