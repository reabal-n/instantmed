/**
 * Real "last reviewed" signal source.
 *
 * Returns the timestamp of the most recent completed review platform-wide
 * (manual doctor reviews and auto-approvals both stamp intakes.reviewed_at).
 * Replaces the fabricated localStorage-seeded version of the homepage signal:
 * the number shown to visitors must be true or absent, never invented
 * (docs/BRAND.md specificity rule; ACL misleading-conduct exposure).
 *
 * Seeded E2E reviews and excluded-from-reporting rows never count — CI runs
 * against the production database and must not fabricate freshness.
 */

import "server-only"

import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export { LAST_REVIEWED_FRESH_MINUTES } from "./last-reviewed-window"

export async function getLastReviewedAt(): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("intakes")
      .select("reviewed_at")
      .not("reviewed_at", "is", null)
      .neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
      .not("exclude_from_reporting", "is", true)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data?.reviewed_at) return null
    return data.reviewed_at as string
  } catch {
    // Marketing garnish only — never let it throw into a page render.
    return null
  }
}
