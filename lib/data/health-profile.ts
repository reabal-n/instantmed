import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import {
  prepareHealthAllergiesWrite,
  prepareHealthConditionsWrite,
  prepareHealthMedicationsWrite,
  prepareHealthNotesWrite,
  readHealthAllergies,
  readHealthConditions,
  readHealthMedications,
  readHealthNotes,
} from "@/lib/security/phi-field-wrappers"

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
    .select("id, patient_id, allergies, allergies_enc, conditions, conditions_enc, current_medications, current_medications_enc, blood_type, emergency_contact_name, emergency_contact_phone, notes, notes_enc, updated_at")
    .eq("patient_id", patientId)
    .maybeSingle()

  if (error) {
    log.error("Failed to fetch health profile", { patientId, error: error.message })
    return null
  }

  if (!data) return null

  // Decrypt PHI fields (prefers encrypted, falls back to plaintext)
  const [allergies, conditions, currentMedications, notes] = await Promise.all([
    readHealthAllergies(data),
    readHealthConditions(data),
    readHealthMedications(data),
    readHealthNotes(data),
  ])

  return {
    id: data.id,
    patient_id: data.patient_id,
    allergies,
    conditions,
    current_medications: currentMedications,
    blood_type: data.blood_type,
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_phone: data.emergency_contact_phone,
    notes,
    updated_at: data.updated_at,
  }
}

export async function upsertHealthProfile(
  patientId: string,
  profile: Partial<Omit<HealthProfile, "id" | "patient_id" | "updated_at">>
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Encrypt PHI fields (dual-write: plaintext + encrypted)
  const [allergiesWrite, conditionsWrite, medicationsWrite, notesWrite] = await Promise.all([
    profile.allergies !== undefined
      ? prepareHealthAllergiesWrite(profile.allergies ?? [])
      : Promise.resolve(undefined),
    profile.conditions !== undefined
      ? prepareHealthConditionsWrite(profile.conditions ?? [])
      : Promise.resolve(undefined),
    profile.current_medications !== undefined
      ? prepareHealthMedicationsWrite(profile.current_medications ?? [])
      : Promise.resolve(undefined),
    profile.notes !== undefined
      ? prepareHealthNotesWrite(profile.notes ?? null)
      : Promise.resolve(undefined),
  ])

  const upsertData: Record<string, unknown> = {
    patient_id: patientId,
    updated_at: new Date().toISOString(),
  }

  // Spread encrypted write results (includes both plaintext and _enc)
  if (allergiesWrite) Object.assign(upsertData, allergiesWrite)
  if (conditionsWrite) Object.assign(upsertData, conditionsWrite)
  if (medicationsWrite) Object.assign(upsertData, medicationsWrite)
  if (notesWrite) Object.assign(upsertData, notesWrite)

  // Non-PHI fields pass through directly
  if (profile.blood_type !== undefined) upsertData.blood_type = profile.blood_type
  if (profile.emergency_contact_name !== undefined) upsertData.emergency_contact_name = profile.emergency_contact_name
  if (profile.emergency_contact_phone !== undefined) upsertData.emergency_contact_phone = profile.emergency_contact_phone

  const { error } = await supabase
    .from("patient_health_profiles")
    .upsert(upsertData, { onConflict: "patient_id" })

  if (error) {
    log.error("Failed to upsert health profile", { patientId, error: error.message })
    return false
  }

  return true
}
