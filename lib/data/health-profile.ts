import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("health-profile")

export interface HealthProfile {
  id: string
  patient_id: string
  allergies: string[]
  conditions: string[]
  current_medications: string[]
  blood_type: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  updated_at: string
}

export async function getHealthProfile(patientId: string): Promise<HealthProfile | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("patient_health_profiles")
    .select("id, patient_id, allergies, conditions, current_medications, blood_type, emergency_contact_name, emergency_contact_phone, notes, updated_at")
    .eq("patient_id", patientId)
    .maybeSingle()

  if (error) {
    log.error("Failed to fetch health profile", { patientId, error: error.message })
    return null
  }

  return data as HealthProfile | null
}

export async function upsertHealthProfile(
  patientId: string,
  profile: Partial<Omit<HealthProfile, "id" | "patient_id" | "updated_at">>
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("patient_health_profiles")
    .upsert(
      {
        patient_id: patientId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id" }
    )

  if (error) {
    log.error("Failed to upsert health profile", { patientId, error: error.message })
    return false
  }

  return true
}
