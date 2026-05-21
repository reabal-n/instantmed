"use server"

import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface DoctorCapabilities {
  can_review_med_certs: boolean
  can_review_repeat_rx: boolean
  can_review_consults: boolean
  can_review_ed: boolean
  can_review_hair_loss: boolean
  can_prescribe_s4: boolean
  can_prescribe_s8: boolean
}

const CAPABILITY_KEYS: (keyof DoctorCapabilities)[] = [
  "can_review_med_certs",
  "can_review_repeat_rx",
  "can_review_consults",
  "can_review_ed",
  "can_review_hair_loss",
  "can_prescribe_s4",
  "can_prescribe_s8",
]

/**
 * Update the seven clinical capability flags on a doctor profile. Admin-only.
 *
 * The owner-operator admin bypasses these flags at runtime (`doctorHasCapability`
 * returns true for admins), but this surface lets the owner pre-scope future
 * doctor hires before they are verified for a specific service line.
 *
 * Every change is audit-logged under `doctor_capabilities_updated` with the
 * full before/after diff for AHPRA traceability.
 */
export async function updateDoctorCapabilitiesAction(
  doctorId: string,
  capabilities: DoctorCapabilities,
): Promise<{ success: boolean; error?: string }> {
  const authUser = await requireRoleOrNull(["admin"])
  if (!authUser) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()

  const { data: before, error: readError } = await supabase
    .from("profiles")
    .select(
      "can_review_med_certs, can_review_repeat_rx, can_review_consults, can_review_ed, can_review_hair_loss, can_prescribe_s4, can_prescribe_s8",
    )
    .eq("id", doctorId)
    .single()
  if (readError || !before) {
    return { success: false, error: "Doctor not found" }
  }

  const beforeRecord = before as unknown as Record<string, unknown>
  const updates: Partial<DoctorCapabilities> = {}
  const diff: Array<{ field: string; from: boolean; to: boolean }> = []
  for (const key of CAPABILITY_KEYS) {
    const next = Boolean(capabilities[key])
    const prev = Boolean(beforeRecord[key])
    if (next !== prev) {
      updates[key] = next
      diff.push({ field: key, from: prev, to: next })
    }
  }

  if (diff.length === 0) return { success: true }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", doctorId)
  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await logAuditEvent({
    action: "doctor_capabilities_updated",
    actorId: authUser.profile.id,
    actorType: "admin",
    metadata: {
      target_doctor_id: doctorId,
      changes: diff,
    },
  })

  revalidatePath("/admin/doctors")
  return { success: true }
}
