import "server-only"

import { AUSTRALIAN_STATES } from "@/lib/constants"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { AustralianState } from "@/types/db"

const logger = createLogger("analytics-geographic")

export interface GeographicBreakdownRow {
  /** Australian state code (NSW, VIC, QLD, ...) or "Unknown" when null. */
  state: string
  count: number
  /** Share of the total, fraction 0-1. */
  share: number
}

export interface GeographicBreakdown {
  windowDays: number
  totalPatients: number
  topStates: GeographicBreakdownRow[]
  unknownCount: number
}

const WINDOW_DAYS = 30
const TOP_N = 5

const EMPTY_BREAKDOWN: GeographicBreakdown = {
  windowDays: WINDOW_DAYS,
  totalPatients: 0,
  topStates: [],
  unknownCount: 0,
}

type ProfileRel = { state?: string | null } | { state?: string | null }[] | null

interface RawRow {
  patient_id: string | null
  profiles: ProfileRel
}

function pickState(row: RawRow): string | null {
  const rel = row.profiles
  if (!rel) return null
  if (Array.isArray(rel)) return rel[0]?.state ?? null
  return rel.state ?? null
}

/**
 * Count distinct paid patients in the last 30 days by their profile state.
 * Patients with null state are counted as "Unknown" and reported separately
 * so the operator can see how much data is still missing.
 *
 * Excludes seeded E2E data. Returns an empty breakdown when there are no
 * paid intakes in the window so the rendering tile can self-hide.
 */
export async function getGeographicBreakdown(): Promise<GeographicBreakdown> {
  const supabase = createServiceRoleClient()
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Pull patient_id + the joined profile state from paid intakes in the
  // window. Distinct-by-patient happens in JS so a patient with 3 requests
  // counts once.
  const query = supabase
    .from("intakes")
    .select("patient_id, profiles!patient_id(state)")
    .gte("paid_at", windowStart)
    .not("paid_at", "is", null)
    .not("patient_id", "is", null)

  const { data, error } = await filterSeededE2EIntakes(query)

  if (error || !data) {
    if (error) logger.error("Failed to fetch geographic breakdown", {}, error)
    return EMPTY_BREAKDOWN
  }

  const stateByPatient = new Map<string, string | null>()
  for (const raw of data as RawRow[]) {
    if (!raw.patient_id) continue
    if (!stateByPatient.has(raw.patient_id)) {
      stateByPatient.set(raw.patient_id, pickState(raw))
    }
  }

  const total = stateByPatient.size
  if (total === 0) {
    return EMPTY_BREAKDOWN
  }

  const counts = new Map<string, number>()
  let unknown = 0
  const validStates = new Set<string>(AUSTRALIAN_STATES)
  for (const state of stateByPatient.values()) {
    const upper = state?.toUpperCase() ?? null
    if (!upper || !validStates.has(upper as AustralianState)) {
      unknown += 1
      continue
    }
    counts.set(upper, (counts.get(upper) ?? 0) + 1)
  }

  const topStates: GeographicBreakdownRow[] = Array.from(counts.entries())
    .map(([state, count]) => ({
      state,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N)

  return {
    windowDays: WINDOW_DAYS,
    totalPatients: total,
    topStates,
    unknownCount: unknown,
  }
}
