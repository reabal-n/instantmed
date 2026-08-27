import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { BusinessAdsActionEvidence } from "@/lib/admin/business-read-model"
import {
  authorizeScriptsBudgetScale,
  POLICY,
  resolveAdsCampaignService,
} from "@/lib/ads-agent/policy"
import {
  type AdsChangeProposal,
  assertAdsProposalOperationsUnchanged,
  getAdsProposalByKey,
  isAdsProposalExpired,
} from "@/lib/ads-agent/proposals"
import type { DeliveredAdsAgentRunEvidence } from "@/lib/ads-agent/runs"
import {
  type AdsScaleAuthorizationEvidence,
} from "@/lib/ads-agent/scripts-scale-authorization"
import { readScriptsScaleAuthorizationEvidence } from "@/lib/ads-agent/scripts-scale-authorization-reader"
import type { AdsAgentSnapshot } from "@/lib/ads-agent/types"

function isCurrentApprovalProposal(args: {
  now: Date
  proposal: AdsChangeProposal
  recommendation: DeliveredAdsAgentRunEvidence["recommendations"][number]
  runId: string
}): boolean {
  const { now, proposal, recommendation, runId } = args
  if (
    proposal.runId !== runId
    || !["validated", "awaiting_approval"].includes(proposal.status)
    || proposal.mutationFamily !== recommendation.proposedMutationFamily
    || proposal.rationale.service !== recommendation.service
    || isAdsProposalExpired(proposal, now)
    || !proposal.validationReceipt?.ok
    || proposal.validationReceipt.baselineHash !== proposal.baselineHash
    || proposal.validationReceipt.proposalKey !== proposal.proposalKey
  ) {
    return false
  }
  try {
    assertAdsProposalOperationsUnchanged(proposal)
    return true
  } catch {
    return false
  }
}

function currentScriptsCampaign(snapshot: AdsAgentSnapshot) {
  const campaigns = snapshot.rolling30.filter((campaign) =>
    campaign.channel === "SEARCH"
    && campaign.campaignStatus !== "REMOVED"
    && resolveAdsCampaignService(campaign) === "scripts")
  return campaigns.length === 1 ? campaigns[0] : null
}

function resolveBusinessAdsActionEvidence(args: {
  now?: Date
  proposals: AdsChangeProposal[]
  run: DeliveredAdsAgentRunEvidence
  scriptsScaleEvidence: AdsScaleAuthorizationEvidence | null
}): BusinessAdsActionEvidence {
  const approvalRecommendations = args.run.recommendations.filter(
    (recommendation) => recommendation.kind === "APPROVAL_NEEDED",
  )
  if (approvalRecommendations.length === 0) return { kind: "none" }
  if (approvalRecommendations.length !== 1) return { kind: "unavailable" }

  const recommendation = approvalRecommendations[0]
  const currentProposals = args.proposals.filter((proposal) =>
    isCurrentApprovalProposal({
      now: args.now ?? new Date(),
      proposal,
      recommendation,
      runId: args.run.id,
    }))
  if (currentProposals.length > 1) return { kind: "unavailable" }
  if (currentProposals.length === 1) {
    const proposal = currentProposals[0]
    return {
      currentValue: proposal.rationale.currentValue,
      kind: "approval_ready",
      mutationFamily: proposal.mutationFamily,
      proposalKey: proposal.proposalKey,
      requestedValue: proposal.rationale.requestedValue,
      service: proposal.rationale.service,
    }
  }

  if (
    recommendation.service !== "scripts"
    || recommendation.proposedMutationFamily !== "campaign_budget"
    || !args.scriptsScaleEvidence
  ) {
    return { kind: "unavailable" }
  }
  const campaign = currentScriptsCampaign(args.scriptsScaleEvidence.snapshot)
  if (
    !campaign
    || campaign.budgetAmountMicros == null
    || campaign.budgetAmountMicros < 0
  ) {
    return { kind: "unavailable" }
  }

  const previousChange = args.scriptsScaleEvidence.previousMaterialChange
  try {
    authorizeScriptsBudgetScale({
      campaign,
      closedDaysAfterPreviousChange: previousChange?.closedDays,
      expectedMicros: campaign.budgetAmountMicros,
      nextMicros: campaign.budgetAmountMicros,
      ordersAfterPreviousChange: previousChange?.attributedOrders,
    })
    return {
      currentBudgetCents: Math.round(campaign.budgetAmountMicros / 10_000),
      kind: "proposal_required",
      mutationFamily: "campaign_budget",
      service: "scripts",
    }
  } catch (error) {
    if (
      error instanceof Error
      && error.message === "scripts_post_change_evidence_immature"
      && previousChange
    ) {
      return {
        attributedOrders: previousChange.attributedOrders,
        closedDays: previousChange.closedDays,
        currentBudgetCents: Math.round(campaign.budgetAmountMicros / 10_000),
        kind: "observation",
        mutationFamily: "campaign_budget",
        requiredAttributedOrders: POLICY.scripts.scale.minimumOrdersAfterChange,
        requiredClosedDays: POLICY.scripts.scale.observationDaysAfterBidChange,
        service: "scripts",
      }
    }
    return { kind: "unavailable" }
  }
}

export async function getBusinessAdsActionEvidence(args: {
  now?: Date
  run: DeliveredAdsAgentRunEvidence | null
  supabase: SupabaseClient
}): Promise<BusinessAdsActionEvidence> {
  if (!args.run) return { kind: "none" }
  const approvalRecommendations = args.run.recommendations.filter(
    (recommendation) => recommendation.kind === "APPROVAL_NEEDED",
  )
  if (approvalRecommendations.length === 0) return { kind: "none" }
  if (approvalRecommendations.length !== 1) return { kind: "unavailable" }

  try {
    const recommendation = approvalRecommendations[0]
    let scriptsScaleEvidenceRead: Promise<AdsScaleAuthorizationEvidence | null> =
      Promise.resolve(null)
    if (
      recommendation.service === "scripts"
      && recommendation.proposedMutationFamily === "campaign_budget"
    ) {
      const campaign = currentScriptsCampaign(args.run.snapshot)
      if (
        !campaign?.budgetResourceName
        || !campaign.campaignResourceName
      ) {
        return { kind: "unavailable" }
      }
      scriptsScaleEvidenceRead = readScriptsScaleAuthorizationEvidence({
        budgetResourceName: campaign.budgetResourceName,
        campaignResourceName: campaign.campaignResourceName,
        liveMaterialChangeAt: null,
        runId: args.run.id,
        service: "scripts",
        supabase: args.supabase,
      })
    }
    const [proposalKeys, scriptsScaleEvidence] = await Promise.all([
      args.supabase
        .from("google_ads_change_proposals")
        .select("proposal_key")
        .eq("run_id", args.run.id)
        .in("status", ["validated", "awaiting_approval"])
        .limit(3),
      scriptsScaleEvidenceRead,
    ])
    if (proposalKeys.error) return { kind: "unavailable" }
    const keys = (proposalKeys.data ?? []).map((row) => row.proposal_key)
    if (keys.some((key) => typeof key !== "string")) {
      return { kind: "unavailable" }
    }
    const proposals = (await Promise.all(
      keys.map((key) => getAdsProposalByKey(args.supabase, key)),
    )).filter((proposal): proposal is AdsChangeProposal => proposal !== null)
    if (proposals.length !== keys.length) return { kind: "unavailable" }

    return resolveBusinessAdsActionEvidence({
      now: args.now,
      proposals,
      run: args.run,
      scriptsScaleEvidence,
    })
  } catch {
    return { kind: "unavailable" }
  }
}
