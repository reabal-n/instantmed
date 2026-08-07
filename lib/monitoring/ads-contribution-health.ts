import type { AdsAgentSnapshot } from "@/lib/ads-agent/types"
import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Rolling-30-day paid-acquisition contribution, read from the latest delivered
 * Ads Agent run.
 *
 * Why this exists: contribution is the one number that decides whether paid
 * acquisition is a business or a subsidy, and until now it was only visible in
 * the 09:15 Telegram card — i.e. it depended on a human reading a message every
 * morning. Rolling 30-day margin slid 9.94% -> 9.27% -> 7.17% across
 * 2026-08-01..03 with no alarm attached to it at any point.
 *
 * Aggregate-only by construction: cents and counts, never an intake, patient,
 * keyword, or campaign identifier.
 */

/** Below this, paid acquisition is too thin to absorb a normal refund week. */
export const ADS_CONTRIBUTION_THIN_MARGIN = 0.05

export interface AdsContributionHealth {
  reportDate: string | null
  orders: number
  spendCents: number
  contributionCents: number
  contributionMargin: number | null
  /** True when no delivered run could be read — never treated as "healthy". */
  unavailable: boolean
}

const UNAVAILABLE: AdsContributionHealth = {
  reportDate: null,
  orders: 0,
  spendCents: 0,
  contributionCents: 0,
  contributionMargin: null,
  unavailable: true,
}

export async function getAdsContributionHealth(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<AdsContributionHealth> {
  try {
    const { data, error } = await supabase
      .from("google_ads_agent_runs")
      .select("report_date, snapshot")
      .eq("status", "delivered")
      .not("snapshot", "is", null)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data?.snapshot) return UNAVAILABLE

    const snapshot = data.snapshot as AdsAgentSnapshot
    const enabled = snapshot?.totals?.rolling30?.enabled
    if (!enabled) return UNAVAILABLE

    // A null here means Google could not supply the figure, which is not the
    // same as zero — treat it as unavailable rather than inventing health.
    if (enabled.contributionCents == null || enabled.spendCents == null) return UNAVAILABLE

    return {
      reportDate: typeof data.report_date === "string" ? data.report_date : null,
      orders: enabled.orders ?? 0,
      spendCents: enabled.spendCents,
      contributionCents: enabled.contributionCents,
      contributionMargin: enabled.contributionMargin,
      unavailable: false,
    }
  } catch {
    return UNAVAILABLE
  }
}

function formatAud(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`
}

/**
 * Negative contribution is critical: every additional order loses money.
 * Thin-but-positive contribution is a warning — it is the state that precedes
 * the critical one, and it is recoverable while it is still cheap.
 *
 * Spend below the floor produces no alert: a near-zero-spend day has a wildly
 * noisy margin and paging on it would train the operator to ignore this metric.
 */
export function buildAdsContributionAlert(
  health: AdsContributionHealth,
  spendFloorCents = 20_000,
): BusinessAlert | null {
  if (health.unavailable) return null
  if (health.spendCents < spendFloorCents) return null

  const asOf = health.reportDate ? ` (as of ${health.reportDate})` : ""
  const shape =
    `${formatAud(health.contributionCents)} contribution on ` +
    `${formatAud(health.spendCents)} spend across ${health.orders} orders${asOf}`

  if (health.contributionCents < 0) {
    return {
      metric: "ads_contribution_negative",
      severity: "critical",
      count: Math.abs(health.contributionCents),
      detail:
        `Paid acquisition is losing money over the rolling 30 days: ${shape}. ` +
        `Every additional ad-driven order deepens the loss. Review spend in /admin/analytics.`,
    }
  }

  const margin = health.contributionMargin
  if (margin != null && margin < ADS_CONTRIBUTION_THIN_MARGIN) {
    return {
      metric: "ads_contribution_thin",
      severity: "warning",
      count: health.contributionCents,
      detail:
        `Paid acquisition contribution is thin: ${(margin * 100).toFixed(1)}% margin — ${shape}. ` +
        `One refund week turns this negative. Review before scaling spend.`,
    }
  }

  return null
}
