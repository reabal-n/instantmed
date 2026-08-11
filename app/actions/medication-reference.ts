"use server"

import { z } from "zod"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import {
  type MedicationCatalogRow,
  resolveGenericMedicationNameFromRows,
} from "@/lib/clinical/generic-medication-resolver"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const MAX_MEDICATION_REFERENCE_LENGTH = 240
const medicationReferenceSchema = z.string().trim().min(2).max(MAX_MEDICATION_REFERENCE_LENGTH)

export interface ResolveGenericMedicationNameActionResult {
  success: boolean
  data?: {
    status: "resolved" | "ambiguous" | "unsafe" | "unresolved"
    genericName?: string
  }
  error?: string
}

/**
 * Doctor/admin-only, first-party catalog lookup for the Parchment handoff.
 * Patient medicine text is never logged, sent to analytics, or included in the
 * database query. Unknown, ambiguous, unsafe, and unavailable results expose
 * no copyable medicine name.
 */
export async function resolveGenericMedicationNameAction(
  patientEntry: string,
): Promise<ResolveGenericMedicationNameActionResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const parsed = medicationReferenceSchema.safeParse(patientEntry)
  if (!parsed.success) {
    return { success: false, error: "Medication reference is invalid" }
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

    return {
      success: true,
      data: {
        status: resolution.status,
        ...(resolution.status === "resolved" ? { genericName: resolution.genericName } : {}),
      },
    }
  } catch {
    return { success: false, error: "Medication reference unavailable" }
  }
}
