import { BATCH_REVIEW_DEADLINE_HOURS } from "@/lib/clinical/batch-review-policy"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface BatchReviewHealth {
  pending: number
  overdue: number
  oldestApprovedAt: string | null
  queryFailed: boolean
}

export async function getBatchReviewHealth(
  supabase: ReturnType<typeof createServiceRoleClient>,
  now = new Date(),
): Promise<BatchReviewHealth> {
  const threshold = new Date(
    now.getTime() - BATCH_REVIEW_DEADLINE_HOURS * 60 * 60 * 1000,
  ).toISOString()

  try {
    const pendingQuery = filterSeededE2EIntakes(supabase
      .from("intakes")
      .select("ai_approved_at", { count: "exact" })
      .eq("ai_approved", true)
      .eq("category", "medical_certificate")
      .in("status", ["approved", "completed"])
      .is("batch_reviewed_at", null))
      .order("ai_approved_at", { ascending: true, nullsFirst: false })
      .limit(1)

    const overdueQuery = filterSeededE2EIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("ai_approved", true)
      .eq("category", "medical_certificate")
      .in("status", ["approved", "completed"])
      .is("batch_reviewed_at", null)
      .lt("ai_approved_at", threshold))

    const [pendingResult, overdueResult] = await Promise.all([pendingQuery, overdueQuery])
    if (pendingResult.error || overdueResult.error) {
      return { pending: 0, overdue: 0, oldestApprovedAt: null, queryFailed: true }
    }

    return {
      pending: pendingResult.count ?? 0,
      overdue: overdueResult.count ?? 0,
      oldestApprovedAt: pendingResult.data?.[0]?.ai_approved_at ?? null,
      queryFailed: false,
    }
  } catch {
    return { pending: 0, overdue: 0, oldestApprovedAt: null, queryFailed: true }
  }
}

export function buildBatchReviewOverdueAlert(
  health: BatchReviewHealth,
  now = new Date(),
): BusinessAlert | null {
  if (health.queryFailed || health.overdue <= 0) return null

  const oldestApprovedMs = health.oldestApprovedAt
    ? new Date(health.oldestApprovedAt).getTime()
    : Number.NaN
  const oldestAgeHours = Number.isFinite(oldestApprovedMs)
    ? Math.max(0, Math.floor((now.getTime() - oldestApprovedMs) / 3_600_000))
    : null
  const certificate = health.overdue === 1
    ? "auto-approved medical certificate is"
    : "auto-approved medical certificates are"
  const oldest = oldestAgeHours == null ? "" : `; oldest pending for ${oldestAgeHours}h`

  return {
    metric: "med_cert_batch_review_overdue",
    severity: "critical",
    count: health.overdue,
    detail: `${health.overdue} ${certificate} past the ${BATCH_REVIEW_DEADLINE_HOURS}h doctor-review window${oldest}. Review ${health.overdue === 1 ? "it" : "them"} in /dashboard.`,
  }
}
