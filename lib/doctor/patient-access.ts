import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("doctor-patient-access")

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

type PatientIdRow = {
  patient_id: string | null
}

type ScriptTaskPatientRow = {
  intake?: { patient_id?: string | null } | Array<{ patient_id?: string | null }> | null
}

function addPatientId(ids: Set<string>, patientId: string | null | undefined) {
  if (typeof patientId === "string" && patientId.length > 0) {
    ids.add(patientId)
  }
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function collectRows(result: PromiseSettledResult<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>, source: string): unknown[] {
  if (result.status === "rejected") {
    log.warn("Doctor patient-access query rejected", { source }, result.reason)
    return []
  }
  if (result.value.error) {
    log.warn("Doctor patient-access query failed", {
      source,
      code: result.value.error.code,
      message: result.value.error.message,
    })
    return []
  }
  return result.value.data ?? []
}

/**
 * Returns the patient ids a non-admin doctor has a concrete clinical
 * relationship with. This deliberately excludes the global unclaimed queue.
 */
export async function getDoctorAccessiblePatientIds(
  doctorId: string,
  supabase: ServiceRoleClient = createServiceRoleClient(),
): Promise<Set<string>> {
  const ids = new Set<string>()
  if (!doctorId) return ids

  const doctorFilter = `claimed_by.eq.${doctorId},reviewing_doctor_id.eq.${doctorId},reviewed_by.eq.${doctorId}`

  const [intakesResult, scriptTasksResult, certificatesResult, notesResult] = await Promise.allSettled([
    supabase
      .from("intakes")
      .select("patient_id")
      .not("patient_id", "is", null)
      .or(doctorFilter)
      .limit(5000),
    supabase
      .from("script_tasks")
      .select("intake:intakes(patient_id)")
      .eq("doctor_id", doctorId)
      .limit(5000),
    supabase
      .from("issued_certificates")
      .select("patient_id")
      .eq("doctor_id", doctorId)
      .limit(5000),
    supabase
      .from("patient_notes")
      .select("patient_id")
      .eq("created_by", doctorId)
      .limit(5000),
  ])

  for (const row of collectRows(intakesResult, "intakes") as PatientIdRow[]) {
    addPatientId(ids, row.patient_id)
  }

  for (const row of collectRows(scriptTasksResult, "script_tasks") as ScriptTaskPatientRow[]) {
    addPatientId(ids, firstRelated(row.intake)?.patient_id)
  }

  for (const row of collectRows(certificatesResult, "issued_certificates") as PatientIdRow[]) {
    addPatientId(ids, row.patient_id)
  }

  for (const row of collectRows(notesResult, "patient_notes") as PatientIdRow[]) {
    addPatientId(ids, row.patient_id)
  }

  return ids
}

export async function doctorCanAccessPatient(
  doctorId: string,
  patientIds: string | string[],
  supabase: ServiceRoleClient = createServiceRoleClient(),
): Promise<boolean> {
  const requestedIds = new Set(Array.isArray(patientIds) ? patientIds : [patientIds])
  if (!doctorId || requestedIds.size === 0) return false

  const accessibleIds = await getDoctorAccessiblePatientIds(doctorId, supabase)
  for (const patientId of requestedIds) {
    if (accessibleIds.has(patientId)) return true
  }
  return false
}
