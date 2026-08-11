import type { SupabaseClient } from "@supabase/supabase-js"

import { getLatestDeliveredAdsAgentRun } from "@/lib/ads-agent/runs"
import type { CampaignPortfolioEconomics } from "@/lib/ads-agent/types"
import type { BusinessAlert } from "@/lib/monitoring/alert-sections"

const ADS_EVIDENCE_STALE_HOURS = 36
const DEFAULT_SPEND_FLOOR_CENTS = 20_000

export type AdsContributionHealth =
  | {
      availability: "available"
      contributionCents: number
      deliveredAt: string
      orders: number
      reportDate: string
      spendCents: number
    }
  | {
      availability: "unavailable"
      reason:
        | "economics_incomplete"
        | "not_found"
        | "stale"
        | "tracking_not_green"
    }

function finitePortfolioValue(
  portfolio: CampaignPortfolioEconomics,
  field: "contributionCents" | "orders" | "spendCents",
): number | null {
  const value = portfolio[field]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function aggregateRolling30(
  totals: unknown,
): Pick<
  Extract<AdsContributionHealth, { availability: "available" }>,
  "contributionCents" | "orders" | "spendCents"
> | null {
  if (!totals || typeof totals !== "object" || Array.isArray(totals)) return null
  const candidate = totals as Partial<Record<
    "enabled" | "other" | "paused",
    CampaignPortfolioEconomics
  >>
  let contributionCents = 0
  let orders = 0
  let spendCents = 0

  for (const portfolio of [candidate.enabled, candidate.paused, candidate.other]) {
    if (
      !portfolio ||
      typeof portfolio !== "object" ||
      !Array.isArray(portfolio.unavailableReasonCodes) ||
      portfolio.unavailableReasonCodes.length > 0
    ) {
      return null
    }
    const contribution = finitePortfolioValue(portfolio, "contributionCents")
    const portfolioOrders = finitePortfolioValue(portfolio, "orders")
    const spend = finitePortfolioValue(portfolio, "spendCents")
    if (contribution === null || portfolioOrders === null || spend === null) return null
    contributionCents += contribution
    orders += portfolioOrders
    spendCents += spend
  }

  return { contributionCents, orders, spendCents }
}

/**
 * Reads immutable delivered Ads evidence only. Query and record-integrity
 * failures throw so the business-alert section pages its own outage. Absence,
 * staleness, non-GREEN tracking, and incomplete economics remain explicit
 * unavailable states and never become a contribution claim.
 */
export async function getAdsContributionHealth(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<AdsContributionHealth> {
  const read = await getLatestDeliveredAdsAgentRun(supabase)
  if (read.availability === "unavailable") {
    if (read.reason === "query_failed") {
      throw new Error("Ads contribution evidence query failed")
    }
    if (read.reason === "invalid_record") {
      throw new Error("Ads contribution evidence record is invalid")
    }
    return { availability: "unavailable", reason: "not_found" }
  }

  const deliveredAtMs = Date.parse(read.run.deliveredAt)
  const ageHours = (now.getTime() - deliveredAtMs) / (60 * 60 * 1000)
  if (!Number.isFinite(ageHours) || ageHours > ADS_EVIDENCE_STALE_HOURS) {
    return { availability: "unavailable", reason: "stale" }
  }
  if (read.run.snapshot.tracking.state !== "GREEN") {
    return { availability: "unavailable", reason: "tracking_not_green" }
  }

  const economics = aggregateRolling30(read.run.snapshot.totals?.rolling30)
  if (!economics) {
    return { availability: "unavailable", reason: "economics_incomplete" }
  }

  return {
    availability: "available",
    deliveredAt: read.run.deliveredAt,
    reportDate: read.run.reportDate,
    ...economics,
  }
}

function formatAud(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`
}

/** Actual loss only. Positive but small margins remain a dashboard decision. */
export function buildAdsContributionAlert(
  health: AdsContributionHealth,
  spendFloorCents = DEFAULT_SPEND_FLOOR_CENTS,
): BusinessAlert | null {
  if (
    health.availability === "unavailable" ||
    health.spendCents < spendFloorCents ||
    health.contributionCents >= 0
  ) {
    return null
  }

  return {
    metric: "ads_contribution_negative",
    severity: "critical",
    count: Math.abs(health.contributionCents),
    detail:
      "Paid acquisition is contribution-negative over the rolling 30 days: " +
      `${formatAud(health.contributionCents)} contribution on ` +
      `${formatAud(health.spendCents)} spend across ${health.orders} orders ` +
      `(as of ${health.reportDate}). Hold scaling and review /admin/analytics.`,
  }
}
