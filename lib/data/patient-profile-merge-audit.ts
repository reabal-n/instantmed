import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("patient-profile-merge-audit")

type ProfileSummary = {
  id: string
  full_name: string | null
  email: string | null
}

type MergeAuditRow = {
  id: string
  canonical_profile_id: string
  duplicate_profile_ids: string[] | null
  merged_by: string | null
  merge_reason: string | null
  reference_counts: Record<string, unknown> | null
  created_at: string
}

export type MergeReferenceSummary = {
  total: number
  movedTables: Array<{ table: string; count: number }>
}

export type PatientProfileMergeAuditEntry = {
  id: string
  canonicalProfileId: string
  canonicalName: string
  canonicalEmail: string | null
  duplicateProfileIds: string[]
  duplicateCount: number
  mergedBy: string
  mergedByEmail: string | null
  reason: string | null
  referenceSummary: MergeReferenceSummary
  createdAt: string
}

function labelProfile(profile: ProfileSummary | undefined, fallbackId: string | null): string {
  if (profile?.full_name) return profile.full_name
  if (profile?.email) return profile.email
  return fallbackId ? fallbackId.slice(0, 8) : "System"
}

export function summarizeMergeReferenceCounts(referenceCounts: unknown): MergeReferenceSummary {
  if (!referenceCounts || typeof referenceCounts !== "object" || Array.isArray(referenceCounts)) {
    return { total: 0, movedTables: [] }
  }

  const movedTables = Object.entries(referenceCounts as Record<string, unknown>)
    .map(([table, rawCount]) => ({
      table,
      count: typeof rawCount === "number" ? rawCount : Number(rawCount || 0),
    }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
    .sort((a, b) => b.count - a.count || a.table.localeCompare(b.table))

  return {
    total: movedTables.reduce((sum, entry) => sum + entry.count, 0),
    movedTables,
  }
}

async function loadProfiles(
  supabase: Pick<SupabaseClient, "from">,
  ids: string[],
): Promise<Map<string, ProfileSummary>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", uniqueIds)

  if (error) {
    log.warn("Failed to load merge audit profile labels", { error: error.message })
    return new Map()
  }

  return new Map(((data || []) as ProfileSummary[]).map((profile) => [profile.id, profile]))
}

export async function getPatientProfileMergeAudit(limit = 50): Promise<{
  entries: PatientProfileMergeAuditEntry[]
  error?: string
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("patient_profile_merge_audit")
    .select("id, canonical_profile_id, duplicate_profile_ids, merged_by, merge_reason, reference_counts, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    log.error("Failed to fetch patient profile merge audit", { error: error.message })
    return { entries: [], error: error.message }
  }

  const rows = (data || []) as MergeAuditRow[]
  const profileIds = rows.flatMap((row) => [
    row.canonical_profile_id,
    row.merged_by,
    ...(row.duplicate_profile_ids || []),
  ]).filter((id): id is string => Boolean(id))
  const profileMap = await loadProfiles(supabase, profileIds)

  return {
    entries: rows.map((row) => {
      const canonical = profileMap.get(row.canonical_profile_id)
      const actor = row.merged_by ? profileMap.get(row.merged_by) : undefined

      return {
        id: row.id,
        canonicalProfileId: row.canonical_profile_id,
        canonicalName: labelProfile(canonical, row.canonical_profile_id),
        canonicalEmail: canonical?.email ?? null,
        duplicateProfileIds: row.duplicate_profile_ids || [],
        duplicateCount: row.duplicate_profile_ids?.length || 0,
        mergedBy: labelProfile(actor, row.merged_by),
        mergedByEmail: actor?.email ?? null,
        reason: row.merge_reason,
        referenceSummary: summarizeMergeReferenceCounts(row.reference_counts),
        createdAt: row.created_at,
      }
    }),
  }
}
