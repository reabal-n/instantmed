"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { updateProfile } from "@/lib/data/profiles"
import {
  buildPrescribingIdentityProfileUpdates,
  type PrescribingIdentityFieldErrors,
  type PrescribingIdentityFormValues,
} from "@/lib/doctor/prescribing-identity-update"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const log = createLogger("prescribing-identity-actions")

export interface PrescribingIdentityActionResult {
  success: boolean
  error?: string
  fieldErrors?: PrescribingIdentityFieldErrors
}

export async function updatePrescribingIdentityAction(
  profileId: string,
  input: PrescribingIdentityFormValues,
  intakeId?: string,
): Promise<PrescribingIdentityActionResult> {
  if (!UUID_RE.test(profileId)) {
    return { success: false, error: "Invalid patient profile." }
  }

  if (intakeId && !UUID_RE.test(intakeId)) {
    return { success: false, error: "Invalid intake." }
  }

  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(authResult.profile.id, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  const validation = buildPrescribingIdentityProfileUpdates(input)
  if (!validation.valid) {
    return {
      success: false,
      error: "Fix the highlighted prescribing identity fields.",
      fieldErrors: validation.fieldErrors,
    }
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .single()

    if (profileError || profile?.role !== "patient") {
      return { success: false, error: "Patient profile not found." }
    }

    const updatedProfile = await updateProfile(profileId, validation.updates)
    if (!updatedProfile) {
      return { success: false, error: "Could not update prescribing identity." }
    }

    await logAuditEvent({
      action: "profile_updated",
      actorId: authResult.profile.id,
      actorType: "admin",
      intakeId,
      metadata: {
        action_type: "prescribing_identity_update",
        updatedFields: Object.keys(validation.updates),
      },
    })

    revalidatePath("/admin/ops")
    revalidatePath("/admin/ops/prescribing-identity")
    revalidatePath(`/doctor/patients/${profileId}`)
    if (intakeId) {
      revalidatePath(`/doctor/intakes/${intakeId}`)
    }

    return { success: true }
  } catch (error) {
    log.error("Failed to update prescribing identity", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return { success: false, error: "Could not update prescribing identity." }
  }
}
