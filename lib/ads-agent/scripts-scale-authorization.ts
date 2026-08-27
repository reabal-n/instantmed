import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { GoogleAdsAccountState } from "@/lib/ads-agent/account-state"
import {
  POLICY,
  resolveAdsCampaignService,
} from "@/lib/ads-agent/policy"
import { isAdsAgentSnapshot } from "@/lib/ads-agent/runs"
import type { AdsAgentSnapshot } from "@/lib/ads-agent/types"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

export interface AdsScaleAuthorizationEvidence {
  previousMaterialChange: {
    attributedOrders: number
    closedDays: number
  } | null
  snapshot: AdsAgentSnapshot
}

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

interface StoredScaleProposalEvidence {
  apply_receipt: unknown
  operations: unknown
  status: unknown
  verification_receipt: unknown
}

interface StoredScaleRunEvidence {
  report_date: unknown
  snapshot: unknown
  status: unknown
}

export function sydneyDateKey(value: string): string | null {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function previousSydneyDateKey(value: string): string | null {
  const key = sydneyDateKey(value)
  if (!key) return null
  const [year, month, day] = key.split("-").map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  return previous.toISOString().slice(0, 10)
}

export function deriveScriptsScaleAuthorizationEvidence(args: {
  budgetResourceName: string
  campaignResourceName: string
  historyComplete: boolean
  latestReportDate: string
  latestSnapshot: unknown
  liveMaterialChangeAt: string | null
  proposals: StoredScaleProposalEvidence[]
  runs: StoredScaleRunEvidence[]
}): AdsScaleAuthorizationEvidence | null {
  if (
    !args.historyComplete
    || !isAdsAgentSnapshot(args.latestSnapshot)
    || args.latestSnapshot.reportDate !== args.latestReportDate
  ) {
    return null
  }
  const touchesTarget = (value: unknown): boolean => {
    if (!Array.isArray(value)) return false
    return value.some((operation) => {
      const record = asRecord(operation)
      const kind = asString(record?.kind)
      const resourceName = asString(record?.resourceName)
      return (
        kind === "campaign_budget"
        && resourceName === args.budgetResourceName
      ) || (
        kind === "campaign_bidding"
        && resourceName === args.campaignResourceName
      )
    })
  }

  const appliedAt: string[] = []
  for (const row of args.proposals.filter((proposal) =>
    touchesTarget(proposal.operations))) {
    const status = asString(row.status)
    const receipt = asRecord(row.apply_receipt)
    const verification = asRecord(row.verification_receipt)
    const outcome = asString(receipt?.outcome)
    const verificationOutcome = asString(verification?.outcome)
    if (status === "applying") return null
    if (outcome === "ambiguous") {
      if (status === "failed" && verificationOutcome === "not_applied") {
        continue
      }
      if (!(status === "verified" && verificationOutcome === "verified")) {
        return null
      }
    } else if (outcome === "applied") {
      if (!(status === "verified" && verificationOutcome === "verified")) {
        return null
      }
    } else {
      continue
    }
    const value = asString(receipt?.appliedAt)
    if (!value || !Number.isFinite(Date.parse(value))) return null
    appliedAt.push(value)
  }
  if (
    args.liveMaterialChangeAt
    && Number.isFinite(Date.parse(args.liveMaterialChangeAt))
  ) {
    appliedAt.push(args.liveMaterialChangeAt)
  }
  appliedAt.sort((left, right) => Date.parse(right) - Date.parse(left))
  const previousChangeAt = appliedAt[0] ?? null
  if (!previousChangeAt) {
    return {
      previousMaterialChange: null,
      snapshot: args.latestSnapshot,
    }
  }

  const changeDate = sydneyDateKey(previousChangeAt)
  if (!changeDate) return null
  let attributedOrders = 0
  let totalOrdersAfterChange = 0
  const closedDates = new Set<string>()
  for (const row of args.runs) {
    if (
      row.status !== "delivered"
      || typeof row.report_date !== "string"
      || row.report_date > args.latestReportDate
      || !isAdsAgentSnapshot(row.snapshot)
      || row.snapshot.reportDate !== row.report_date
      || !Array.isArray(row.snapshot.daily)
      || closedDates.has(row.report_date)
    ) {
      return null
    }
    if (row.report_date <= changeDate) continue
    const campaigns = row.snapshot.daily.filter((campaign) =>
      campaign.campaignResourceName === args.campaignResourceName
      && resolveAdsCampaignService(campaign) === "scripts")
    const totalOrders = campaigns[0]?.orders
    const scriptsOrders = campaigns[0]?.serviceOrders.scripts ?? 0
    if (
      campaigns.length !== 1
      || totalOrders == null
      || totalOrders < 0
      || scriptsOrders < 0
      || scriptsOrders > totalOrders
    ) {
      return null
    }
    closedDates.add(row.report_date)
    attributedOrders += scriptsOrders
    totalOrdersAfterChange += totalOrders
  }
  if (
    totalOrdersAfterChange > 0
    && attributedOrders / totalOrdersAfterChange
      < POLICY.attribution.minimumExpectedServiceOrderShare
  ) return null
  return {
    previousMaterialChange: {
      attributedOrders,
      closedDays: closedDates.size,
    },
    snapshot: args.latestSnapshot,
  }
}

export function resolveLatestAdsMaterialChangeAt(args: {
  budgetResourceName: string
  campaignResourceName: string
  state: GoogleAdsAccountState
}): string | null {
  const relevantCampaignField = (fields: unknown): boolean => {
    const value = JSON.stringify(fields)
      .toLowerCase()
      .replace(/[_\-.]/g, "")
    return [
      "bidding",
      "campaignbudget",
      "maximizeconversionvalue",
      "targetroas",
    ].some((field) => value.includes(field))
  }
  const candidates = args.state.changeEvents
    .filter((event) => {
      if (event.changeResourceName === args.budgetResourceName) return true
      return event.changeResourceName === args.campaignResourceName
        && relevantCampaignField(event.changedFields)
    })
    .map((event) => event.changeDateTime)
    .filter((value): value is string =>
      value != null && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))
  return candidates[0]
    ?? (
      args.state.changeEventHistoryStartAt
      && Number.isFinite(Date.parse(args.state.changeEventHistoryStartAt))
        ? args.state.changeEventHistoryStartAt
        : null
    )
}
