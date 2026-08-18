"use server"

import { z } from "zod"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import {
  type MedicationCatalogRow,
  resolveGenericMedicationNameFromRows,
} from "@/lib/clinical/generic-medication-resolver"
import {
  findPriorMedicationMatch,
  type PriorMedicationMatchKind,
} from "@/lib/clinical/prior-medication-match"
import { isParchmentClaimSatisfied } from "@/lib/doctor/parchment-claim"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const MAX_MEDICATION_REFERENCE_LENGTH = 240
const medicationReferenceSchema = z.string().trim().min(2).max(MAX_MEDICATION_REFERENCE_LENGTH)
const intakeIdSchema = z.string().trim().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
)

export interface ResolveGenericMedicationNameActionResult {
  success: boolean
  data?: {
    status: "resolved" | "ambiguous" | "unsafe" | "unresolved"
    genericName?: string
    source?: "previous_prescription"
    matchKind?: PriorMedicationMatchKind
  }
  error?: string
}

/**
 * Doctor/admin-only, first-party lookup for the Parchment handoff. Exact
 * catalog matches are preferred; an unresolved request may be compared with
 * the same patient's prior prescriptions when an intake id is supplied.
 * Patient medicine text is never logged, sent to analytics, or included in a
 * database query. Unknown, ambiguous, unsafe, and unavailable results expose
 * no copyable medicine name.
 */
export async function resolveGenericMedicationNameAction(
  patientEntry: string,
  intakeId?: string,
): Promise<ResolveGenericMedicationNameActionResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const parsed = medicationReferenceSchema.safeParse(patientEntry)
  if (!parsed.success) {
    return { success: false, error: "Medication reference is invalid" }
  }

  let parsedIntakeId: string | null = null
  if (intakeId !== undefined) {
    const intakeIdResult = intakeIdSchema.safeParse(intakeId)
    if (!intakeIdResult.success) {
      return { success: false, error: "Medication reference is invalid" }
    }
    parsedIntakeId = intakeIdResult.data
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("medications")
      .select("name, brand_names")
      .eq("is_active", true)

    if (error || !Array.isArray(data)) {
      return { success: false, error: "Medication reference unavailable" }
    }

    const resolution = resolveGenericMedicationNameFromRows(
      parsed.data,
      data as MedicationCatalogRow[],
    )

    if (resolution.status !== "unresolved" || !parsedIntakeId) {
      return {
        success: true,
        data: {
          status: resolution.status,
          ...(resolution.status === "resolved" ? { genericName: resolution.genericName } : {}),
        },
      }
    }

    // A typo fallback is advisory only and is restricted to this patient's own
    // non-cancelled prescription history. It never changes request state or
    // bypasses Parchment confirmation.
    const { data: intake } = await supabase
      .from("intakes")
      .select("patient_id, claimed_by, reviewing_doctor_id, reviewed_by")
      .eq("id", parsedIntakeId)
      .maybeSingle()

    const canAccessIntake = auth.profile.role === "admin" || (
      intake
      && isParchmentClaimSatisfied(intake, auth.profile.id)
    )
    if (!canAccessIntake) {
      return { success: false, error: "Unauthorized" }
    }

    const patientId = typeof intake?.patient_id === "string" ? intake.patient_id : null
    if (!patientId) {
      return { success: true, data: { status: "unresolved" } }
    }

    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from("prescriptions")
      .select("medication_name")
      .eq("patient_id", patientId)
      .in("status", ["active", "completed", "expired"])
      .order("created_at", { ascending: false })
      .limit(20)

    if (prescriptionsError || !Array.isArray(prescriptions)) {
      return { success: true, data: { status: "unresolved" } }
    }

    const priorMatch = findPriorMedicationMatch(
      parsed.data,
      prescriptions
        .map((prescription) => prescription?.medication_name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0),
    )
    if (!priorMatch) {
      return { success: true, data: { status: "unresolved" } }
    }

    const priorResolution = resolveGenericMedicationNameFromRows(
      priorMatch.medicationName,
      data as MedicationCatalogRow[],
    )
    if (priorResolution.status === "resolved") {
      return {
        success: true,
        data: {
          status: "resolved",
          genericName: priorResolution.genericName,
          source: "previous_prescription",
          matchKind: priorMatch.kind,
        },
      }
    }

    return {
      success: true,
      data: { status: "unresolved" },
    }
  } catch {
    return { success: false, error: "Medication reference unavailable" }
  }
}
