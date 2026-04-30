"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import {
  buildPatientProfileMergeRequest,
  validatePatientProfileMergeProfiles,
} from "@/lib/doctor/patient-profile-merge"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("patient-profile-merge-actions")

interface PatientProfileMergeRpcResult {
  canonicalProfileId?: string
  duplicateProfileIds?: string[]
  mergedProfileCount?: number
  referenceCounts?: Record<string, number>
}

export interface MergePatientProfilesActionResult {
  success: boolean
  error?: string
  mergedProfileCount?: number
  referenceCounts?: Record<string, number>
}

function formatMergeError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : String(error || "")

  if (message.includes("Signed-in duplicate profiles")) {
    return "Signed-in duplicate profiles need manual review before merge."
  }
  if (message.includes("health profile rows")) {
    return "Both profiles have health profile rows. Review the records before merging."
  }
  if (message.includes("duplicate patient profiles were not found")) {
    return "One or more duplicate patient profiles were not found."
  }
  if (message.includes("canonical patient profile")) {
    return "Canonical patient profile was not found."
  }

  return "Could not merge patient profiles."
}

export async function mergePatientProfilesAction(
  canonicalPatientId: string,
  duplicatePatientIds: string[],
  reason?: string,
): Promise<MergePatientProfilesActionResult> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`admin:${authResult.profile.id}:patient-profile-merge`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  let request
  try {
    request = buildPatientProfileMergeRequest({
      canonicalPatientId,
      duplicatePatientIds,
      mergedByProfileId: authResult.profile.id,
      reason,
    })
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Invalid merge request." }
  }

  try {
    const supabase = createServiceRoleClient()
    const profileIds = [request.canonicalPatientId, ...request.duplicatePatientIds]

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, role, auth_user_id, merged_into_profile_id")
      .in("id", profileIds)

    if (profilesError) {
      log.error("Failed to fetch patient profiles before merge", {
        canonicalPatientId: request.canonicalPatientId,
        duplicateCount: request.duplicatePatientIds.length,
      }, profilesError)
      return { success: false, error: "Could not verify patient profiles before merge." }
    }

    const validation = validatePatientProfileMergeProfiles({
      canonicalPatientId: request.canonicalPatientId,
      duplicatePatientIds: request.duplicatePatientIds,
      profiles: (profiles || []).map((profile) => ({
        id: String(profile.id),
        role: typeof profile.role === "string" ? profile.role : null,
        auth_user_id: typeof profile.auth_user_id === "string" ? profile.auth_user_id : null,
        merged_into_profile_id: typeof profile.merged_into_profile_id === "string"
          ? profile.merged_into_profile_id
          : null,
      })),
    })

    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const { data, error } = await supabase.rpc("merge_patient_profiles", {
      p_canonical_profile_id: request.canonicalPatientId,
      p_duplicate_profile_ids: request.duplicatePatientIds,
      p_merged_by: request.mergedByProfileId,
      p_merge_reason: request.reason,
    })

    if (error) {
      log.error("Failed to merge patient profiles", {
        canonicalPatientId: request.canonicalPatientId,
        duplicateCount: request.duplicatePatientIds.length,
        code: error.code,
      }, error)
      return { success: false, error: formatMergeError(error) }
    }

    const result = (data || {}) as PatientProfileMergeRpcResult

    revalidatePath("/admin/ops")
    revalidatePath("/doctor/patients")
    revalidatePath(`/doctor/patients/${request.canonicalPatientId}`)
    request.duplicatePatientIds.forEach((profileId) => {
      revalidatePath(`/doctor/patients/${profileId}`)
    })

    return {
      success: true,
      mergedProfileCount: result.mergedProfileCount ?? request.duplicatePatientIds.length,
      referenceCounts: result.referenceCounts ?? {},
    }
  } catch (error) {
    log.error("Unexpected patient profile merge failure", {
      canonicalPatientId: request.canonicalPatientId,
      duplicateCount: request.duplicatePatientIds.length,
    }, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return { success: false, error: formatMergeError(error) }
  }
}
