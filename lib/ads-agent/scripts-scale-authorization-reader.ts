import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isAdsAgentSnapshot } from "@/lib/ads-agent/runs"
import {
  type AdsScaleAuthorizationEvidence,
  deriveScriptsScaleAuthorizationEvidence,
  sydneyDateKey,
} from "@/lib/ads-agent/scripts-scale-authorization"

export async function readScriptsScaleAuthorizationEvidence(args: {
  budgetResourceName: string
  campaignResourceName: string
  liveMaterialChangeAt: string | null
  runId: string | null
  service: "scripts"
  supabase: SupabaseClient
}): Promise<AdsScaleAuthorizationEvidence | null> {
  if (!args.runId) return null
  const [source, latest] = await Promise.all([
    args.supabase
      .from("google_ads_agent_runs")
      .select("id, report_date, status, snapshot")
      .eq("id", args.runId)
      .maybeSingle(),
    args.supabase
      .from("google_ads_agent_runs")
      .select("id, report_date, status, snapshot")
      .eq("status", "delivered")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (
    source.error
    || latest.error
    || source.data?.status !== "delivered"
    || latest.data?.status !== "delivered"
    || typeof latest.data.report_date !== "string"
    || !isAdsAgentSnapshot(latest.data.snapshot)
  ) {
    return null
  }

  const historyCutoff = new Date(
    Date.parse(latest.data.snapshot.generatedAt) - 90 * 24 * 60 * 60 * 1_000,
  ).toISOString()
  const proposalFields =
    "id, status, mutation_family, operations, apply_receipt, verification_receipt, updated_at" as const
  const [recent, applying, ambiguousFailed] = await Promise.all([
    args.supabase
      .from("google_ads_change_proposals")
      .select(proposalFields)
      .in("mutation_family", ["campaign_budget", "campaign_bidding"])
      .gte("updated_at", historyCutoff)
      .order("updated_at", { ascending: false })
      .limit(200),
    args.supabase
      .from("google_ads_change_proposals")
      .select(proposalFields)
      .in("mutation_family", ["campaign_budget", "campaign_bidding"])
      .eq("status", "applying")
      .limit(200),
    args.supabase
      .from("google_ads_change_proposals")
      .select(proposalFields)
      .in("mutation_family", ["campaign_budget", "campaign_bidding"])
      .eq("status", "failed")
      .eq("apply_receipt->>outcome", "ambiguous")
      .limit(200),
  ])
  if (
    recent.error
    || applying.error
    || ambiguousFailed.error
    || (recent.data?.length ?? 0) >= 200
    || (applying.data?.length ?? 0) >= 200
    || (ambiguousFailed.data?.length ?? 0) >= 200
  ) {
    return null
  }
  const proposalRows = new Map<string, (typeof recent.data)[number]>()
  for (const row of [
    ...(recent.data ?? []),
    ...(applying.data ?? []),
    ...(ambiguousFailed.data ?? []),
  ]) {
    if (typeof row.id !== "string") return null
    proposalRows.set(row.id, row)
  }

  const firstHistoryDate = sydneyDateKey(historyCutoff)
  if (!firstHistoryDate) return null
  const runs = await args.supabase
    .from("google_ads_agent_runs")
    .select("report_date, status, snapshot")
    .eq("status", "delivered")
    .gte("report_date", firstHistoryDate)
    .lte("report_date", latest.data.report_date)
    .order("report_date", { ascending: true })
  if (runs.error) return null
  return deriveScriptsScaleAuthorizationEvidence({
    budgetResourceName: args.budgetResourceName,
    campaignResourceName: args.campaignResourceName,
    historyComplete: (
      (recent.data?.length ?? 0) < 200
      && (applying.data?.length ?? 0) < 200
      && (ambiguousFailed.data?.length ?? 0) < 200
    ),
    latestReportDate: latest.data.report_date,
    latestSnapshot: latest.data.snapshot,
    liveMaterialChangeAt: args.liveMaterialChangeAt,
    proposals: [...proposalRows.values()],
    runs: runs.data ?? [],
  })
}
