import "server-only"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { hasAdminAccess, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import { doctorCanAccessPatient } from "@/lib/doctor/patient-access"
import type { PatientTimelinePrescription } from "@/lib/doctor/prescription-history-types"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface ReviewPrescriptionHistory {
  prescriptions: PatientTimelinePrescription[]
  hasMore: boolean
  error: string | null
}

/** Recorded prescriptions only: never infer an issued regimen from intake answers. */
export async function getReviewPrescriptionHistory(patientId: string): Promise<ReviewPrescriptionHistory> {
  const unavailable = (error: string): ReviewPrescriptionHistory => ({ prescriptions: [], hasMore: false, error })
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth || !hasDoctorAccess(auth.profile)) return unavailable("Unauthorized")

  try {
    const supabase = createServiceRoleClient()
    if (!hasAdminAccess(auth.profile) && !await doctorCanAccessPatient(auth.profile.id, patientId, supabase)) {
      return unavailable("Prescription history requires clinical patient access. Claim this request or open a patient you have reviewed.")
    }
    const { data, error } = await supabase
      .from("prescriptions")
      .select("id, medication_name, medication_strength, dosage_instructions, quantity_prescribed, repeats_allowed, status, issued_date, created_at, parchment_reference, intake_id")
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(21)
    if (error) return unavailable("Could not load prescription history. Try refreshing.")
    return {
      prescriptions: (data ?? []).slice(0, 20).map((row) => ({
        id: row.id,
        source: row.parchment_reference ? "parchment" : "instantmed",
        medication_name: row.medication_name,
        medication_strength: row.medication_strength,
        dosage_instructions: row.dosage_instructions,
        quantity_prescribed: row.quantity_prescribed,
        repeats_allowed: row.repeats_allowed,
        status: row.status,
        recorded_at: row.issued_date || row.created_at,
        parchment_reference: row.parchment_reference,
        request_id: row.intake_id,
      })),
      hasMore: (data?.length ?? 0) > 20,
      error: null,
    }
  } catch {
    return unavailable("Could not load prescription history. Try refreshing.")
  }
}
