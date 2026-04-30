import { decryptProfilePhi } from "@/lib/data/profiles"
import {
  type DuplicatePatientProfilesSummary,
  summarizeDuplicatePatientProfiles,
} from "@/lib/doctor/patient-snapshot"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile } from "@/types/db"

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

export async function getDuplicatePatientProfileSummary(
  supabase: ServiceRoleClient,
): Promise<DuplicatePatientProfilesSummary> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, email, full_name, date_of_birth, date_of_birth_encrypted,
      phone, phone_encrypted, role, created_at, updated_at
    `)
    .eq("role", "patient")

  if (error) {
    return {
      rawProfileCount: 0,
      uniqueProfileCount: 0,
      duplicateProfileCount: 0,
      duplicateGroupCount: 0,
    }
  }

  const patients = (data || []).map(row => asProfile(decryptProfilePhi(row as Record<string, unknown>)))
  return summarizeDuplicatePatientProfiles(patients)
}
