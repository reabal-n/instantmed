"use server"

import * as Sentry from "@sentry/nextjs"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { PATIENT_PROFILE_MERGE_REFERENCE_TABLES } from "@/lib/doctor/patient-merge-plan"
import {
  buildPatientProfileMergeRequest,
  validatePatientProfileMergeProfiles,
} from "@/lib/doctor/patient-profile-merge"
import { createLogger } from "@/lib/observability/logger"
import { validateIntegration } from "@/lib/parchment/client"
import {
  ParchmentPatientIdentityError,
  ParchmentPatientSyncError,
  syncPatientToParchment,
} from "@/lib/parchment/sync-patient"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
  parchmentPatientId?: string
  syncedToParchment?: boolean
  syncWarning?: string
}

export interface DeletePatientProfileActionResult {
  success: boolean
  error?: string
  blockedBy?: Record<string, number>
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

function formatParchmentSyncWarning(error: unknown): string {
  if (error instanceof ParchmentPatientIdentityError) {
    return `Profiles merged, but Parchment sync is missing: ${error.issues.join(", ")}.`
  }
  if (error instanceof ParchmentPatientSyncError) {
    return "Profiles merged, but Parchment rejected the canonical patient details. Check Medicare/IHI, address, DOB, phone, and sex; then retry sync."
  }
  return "Profiles merged, but Parchment could not be synced. Retry sync from the prescribing strip."
}

function compactCounts(counts: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0))
}

function formatDeleteBlockedMessage(blockedBy: Record<string, number>): string {
  const blockers = Object.entries(blockedBy)
    .map(([table, count]) => `${table} (${count})`)
    .join(", ")

  return `Cannot delete this patient profile because retained records exist: ${blockers}. Reconcile duplicate profiles or close/archive the account instead.`
}

async function getPatientReferenceCounts(
  supabase: ReturnType<typeof createServiceRoleClient>,
  patientId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const referenceTables = [
    ...PATIENT_PROFILE_MERGE_REFERENCE_TABLES,
    { table: "profiles", column: "merged_into_profile_id" },
    { table: "patient_profile_merge_audit", column: "canonical_profile_id" },
  ] as const

  for (const reference of referenceTables) {
    const { count, error } = await supabase
      .from(reference.table)
      .select("id", { count: "exact", head: true })
      .eq(reference.column, patientId)

    if (error) {
      if (["42P01", "42703"].includes(error.code)) {
        counts[reference.table] = 0
        continue
      }
      throw error
    }

    counts[reference.table] = count ?? 0
  }

  return counts
}

export async function mergePatientProfilesAction(
  canonicalPatientId: string,
  duplicatePatientIds: string[],
  reason?: string,
  syncToParchment = false,
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
    let parchmentPatientId: string | undefined
    let syncedToParchment = false
    let syncWarning: string | undefined

    if (syncToParchment) {
      const { data: operatorProfile, error: operatorError } = await supabase
        .from("profiles")
        .select("parchment_user_id")
        .eq("id", authResult.profile.id)
        .maybeSingle()

      if (operatorError) {
        syncWarning = "Profiles merged, but the prescriber profile could not be checked for Parchment sync."
      } else if (!operatorProfile?.parchment_user_id) {
        syncWarning = "Profiles merged, but Parchment sync was skipped because the prescriber account is not linked."
      } else {
        try {
          await validateIntegration(operatorProfile.parchment_user_id)
          parchmentPatientId = await syncPatientToParchment(
            request.canonicalPatientId,
            operatorProfile.parchment_user_id,
          )
          syncedToParchment = true

          await logAuditEvent({
            action: "admin_action",
            actorId: authResult.profile.id,
            actorType: "admin",
            metadata: {
              action_type: "patient_profile_parchment_sync",
              source: "patient_profile_merge",
              patient_id: request.canonicalPatientId,
              parchment_patient_id: parchmentPatientId,
            },
          })
        } catch (syncError) {
          syncWarning = formatParchmentSyncWarning(syncError)
          Sentry.captureException(syncError, {
            extra: {
              context: "patient_profile_merge_parchment_sync",
              canonicalPatientId: request.canonicalPatientId,
            },
          })
        }
      }
    }

    revalidateStaff({ ops: true, patientId: request.canonicalPatientId })
    request.duplicatePatientIds.forEach((profileId) => {
      revalidateStaff({ patientId: profileId })
    })

    return {
      success: true,
      mergedProfileCount: result.mergedProfileCount ?? request.duplicatePatientIds.length,
      referenceCounts: result.referenceCounts ?? {},
      parchmentPatientId,
      syncedToParchment,
      syncWarning,
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

export async function deletePatientProfileAction(
  patientId: string,
): Promise<DeletePatientProfileActionResult> {
  if (!UUID_RE.test(patientId)) {
    return { success: false, error: "Invalid patient profile." }
  }

  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`admin:${authResult.profile.id}:patient-profile-delete`, "admin")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: patient, error: patientError } = await supabase
      .from("profiles")
      .select("id, role, auth_user_id, merged_into_profile_id")
      .eq("id", patientId)
      .maybeSingle()

    if (patientError) {
      log.error("Failed to fetch patient profile before delete", { patientId }, patientError)
      return { success: false, error: "Could not verify the patient profile before delete." }
    }

    if (!patient || patient.role !== "patient") {
      return { success: false, error: "Patient profile not found." }
    }

    const referenceCounts = await getPatientReferenceCounts(supabase, patientId)
    const blockedBy = compactCounts({
      ...referenceCounts,
      ...(patient.auth_user_id ? { auth_account: 1 } : {}),
      ...(patient.merged_into_profile_id ? { merged_profile: 1 } : {}),
    })

    if (Object.keys(blockedBy).length > 0) {
      return {
        success: false,
        blockedBy,
        error: formatDeleteBlockedMessage(blockedBy),
      }
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", patientId)
      .eq("role", "patient")
      .is("auth_user_id", null)
      .is("merged_into_profile_id", null)
      .select("id")
      .maybeSingle()

    if (deleteError) {
      log.error("Failed to delete empty patient profile", { patientId }, deleteError)
      return { success: false, error: "Could not delete the patient profile." }
    }

    if (!deleted?.id) {
      return { success: false, error: "Patient profile was not deleted. Refresh and try again." }
    }

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "patient_profile_deleted",
        patient_id: patientId,
        deletion_scope: "empty_guest_profile",
      },
    })

    revalidateStaff({ ops: true, patientId })

    return { success: true }
  } catch (error) {
    log.error("Unexpected patient profile delete failure", { patientId }, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "patient_profile_delete", patientId } })
    return { success: false, error: "Could not delete the patient profile." }
  }
}
