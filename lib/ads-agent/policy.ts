import type {
  AdsAgentSnapshot,
  AdsRecommendation,
  AdsService,
  CampaignEconomics,
} from "@/lib/ads-agent/types"

const SPECIALTY_SERVICES = [
  "ed",
  "hair_loss",
  "womens_health",
] as const satisfies readonly AdsService[]

const SERVICE_ORDER = [
  "med_certs",
  "scripts",
  ...SPECIALTY_SERVICES,
] as const satisfies readonly AdsService[]

export const POLICY = {
  account: {
    dailyBudgetEnvelopeCents: 8_400,
  },
  ed: {
    dailyBudgetCents: 700,
    pilot: {
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumLossCents: 15_000,
      pauseProposalClicks: 30,
    },
  },
  hairLoss: {
    dailyBudgetCents: 700,
    pilot: {
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumLossCents: 15_000,
      pauseProposalClicks: 30,
    },
  },
  keywords: {
    broadMatchPositivesAllowed: false,
    medicineNamesAllowed: false,
  },
  medCerts: {
    dailyBudgetCents: 2_000,
    targetCpaCents: 2_200,
  },
  scripts: {
    dailyBudgetCents: 4_000,
    scale: {
      initialTargetRoas: 1.35,
      maximumBudgetStep: 0.20,
      maximumRefundRate: 0.10,
      minimumContributionMargin: 0.20,
      minimumMatureOrders: 10,
      observationDaysAfterBidChange: 7,
    },
  },
  womensHealth: {
    dailyBudgetCents: 1_000,
    pilot: {
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumLossCents: 15_000,
      pauseProposalClicks: 30,
    },
  },
} as const

const PROHIBITED_PAID_MEDICINE_TERM_PATTERN =
  /\b(?:amlodipine|atorvastatin|cialis|duromine|dutasteride|finasteride|minoxidil|mounjaro|nitrofurantoin|ozempic|perindopril|phentermine|ramipril|rosuvastatin|semaglutide|seretide|sildenafil|symbicort|tadalafil|tirzepatide|trimethoprim|valium|ventolin|viagra|wegovy|xanax)\b/i

export function containsProhibitedPaidMedicineTerm(value: string): boolean {
  return PROHIBITED_PAID_MEDICINE_TERM_PATTERN.test(value)
}

function hold(
  service: AdsService,
  ...reasonCodes: string[]
): AdsRecommendation {
  return {
    kind: "HOLD",
    proposedMutationFamily: null,
    reasonCodes,
    service,
  }
}

function investigate(
  service: AdsService,
  ...reasonCodes: string[]
): AdsRecommendation {
  return {
    kind: "INVESTIGATE",
    proposedMutationFamily: null,
    reasonCodes,
    service,
  }
}

function normalizedCampaignName(campaign: CampaignEconomics): string {
  return campaign.campaignName
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
}

export function resolveAdsCampaignService(
  campaign: CampaignEconomics,
): AdsService | null {
  const name = normalizedCampaignName(campaign)

  if (name.includes("med cert") || name.includes("medical cert")) {
    return "med_certs"
  }
  if (name.includes("script") || name.includes("prescription")) {
    return "scripts"
  }
  if (name.includes("hair loss")) {
    return "hair_loss"
  }
  if (
    name.includes("womens health")
    || name.includes("women health")
    || name.includes("contraception")
    || /(?:^|\W)uti(?:\W|$)/.test(name)
  ) {
    return "womens_health"
  }
  if (/(?:^|\W)ed(?:\W|$)/.test(name)) {
    return "ed"
  }

  const attributedServices = Object.entries(campaign.serviceOrders)
    .filter(([, orders]) => orders > 0)
    .map(([service]) => service)
    .filter((service): service is AdsService =>
      SERVICE_ORDER.includes(service as (typeof SERVICE_ORDER)[number]),
    )

  return attributedServices.length === 1 ? attributedServices[0] : null
}

function groupedCampaigns(
  snapshot: AdsAgentSnapshot,
): Map<AdsService, CampaignEconomics[]> {
  const campaigns = new Map<AdsService, CampaignEconomics[]>()

  for (const campaign of snapshot.rolling30) {
    if (campaign.channel !== "SEARCH" || campaign.campaignStatus === "REMOVED") {
      continue
    }
    const service = resolveAdsCampaignService(campaign)
    if (!service || service === "account") continue
    const existing = campaigns.get(service) ?? []
    existing.push(campaign)
    campaigns.set(service, existing)
  }

  return campaigns
}

function campaignHasMixedServiceOrders(
  campaign: CampaignEconomics,
  expectedService: AdsService,
): boolean {
  return Object.entries(campaign.serviceOrders).some(
    ([service, orders]) =>
      orders > 0
      && SERVICE_ORDER.includes(service as (typeof SERVICE_ORDER)[number])
      && service !== expectedService,
  )
}

function economicsUnavailable(campaign: CampaignEconomics): boolean {
  return (
    campaign.contributionCents == null
    || campaign.orders == null
    || campaign.refundRate == null && campaign.orders > 0
    || campaign.spendCents == null
    || campaign.stripeFeeCents == null
    || campaign.unavailableReasonCodes.length > 0
  )
}

function evaluateScripts(campaign: CampaignEconomics): AdsRecommendation {
  if (economicsUnavailable(campaign) || campaign.contributionMargin == null) {
    return investigate("scripts", "ECONOMICS_UNAVAILABLE")
  }
  if (
    campaign.refundRate == null
    || campaign.refundRate >= POLICY.scripts.scale.maximumRefundRate
  ) {
    return hold("scripts", "SCRIPTS_REFUND_GATE")
  }
  if (campaign.orders! < POLICY.scripts.scale.minimumMatureOrders) {
    return hold("scripts", "POST_CHANGE_SAMPLE_IMMATURE")
  }
  if (
    campaign.contributionMargin
    < POLICY.scripts.scale.minimumContributionMargin
  ) {
    return hold("scripts", "SCRIPTS_CONTRIBUTION_GATE")
  }

  return {
    kind: "APPROVAL_NEEDED",
    proposedMutationFamily: "campaign_bidding",
    reasonCodes: ["SCRIPTS_SCALE_GATES_PASSED"],
    service: "scripts",
  }
}

function evaluateMedCerts(campaign: CampaignEconomics): AdsRecommendation {
  if (economicsUnavailable(campaign)) {
    return investigate("med_certs", "ECONOMICS_UNAVAILABLE")
  }
  if (campaign.contributionCents! < 0) {
    return hold("med_certs", "MEDCERT_NEGATIVE_CONTRIBUTION")
  }
  return hold("med_certs", "MEDCERT_OBSERVATION_HOLD")
}

function specialtyPilot(
  service: (typeof SPECIALTY_SERVICES)[number],
): (typeof POLICY.ed.pilot) {
  if (service === "hair_loss") return POLICY.hairLoss.pilot
  if (service === "womens_health") return POLICY.womensHealth.pilot
  return POLICY.ed.pilot
}

function evaluateSpecialty(
  service: (typeof SPECIALTY_SERVICES)[number],
  campaign: CampaignEconomics,
): AdsRecommendation {
  if (economicsUnavailable(campaign)) {
    return investigate(service, "ECONOMICS_UNAVAILABLE")
  }

  const lossCents = Math.max(0, -(campaign.contributionCents ?? 0))
  if (lossCents >= specialtyPilot(service).maximumLossCents) {
    if (campaign.campaignStatus !== "ENABLED") {
      return hold(service, "SPECIALTY_LOSS_CAP", "CAMPAIGN_ALREADY_PAUSED")
    }
    return {
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
      service,
    }
  }

  return hold(service, "PILOT_WITHIN_LOSS_CAP")
}

/**
 * Evaluates campaign-level economics only. Portfolio totals are intentionally
 * not used for service decisions so a profitable Scripts campaign can never
 * subsidise or conceal a losing specialty pilot.
 */
export function evaluateAdsPolicy(
  snapshot: AdsAgentSnapshot,
): AdsRecommendation[] {
  if (snapshot.account.dailyBudgetTotalCents == null) {
    return [investigate("account", "BUDGET_ENVELOPE_UNAVAILABLE")]
  }
  if (
    snapshot.account.dailyBudgetTotalCents
    > POLICY.account.dailyBudgetEnvelopeCents
  ) {
    return [hold("account", "BUDGET_ENVELOPE_EXCEEDED")]
  }

  const campaigns = groupedCampaigns(snapshot)
  const recommendations: AdsRecommendation[] = []

  for (const service of SERVICE_ORDER) {
    const serviceCampaigns = campaigns.get(service) ?? []
    if (serviceCampaigns.length === 0) continue
    if (serviceCampaigns.length > 1) {
      recommendations.push(
        investigate(service, "MULTIPLE_SERVICE_CAMPAIGNS"),
      )
      continue
    }

    const campaign = serviceCampaigns[0]
    if (campaignHasMixedServiceOrders(campaign, service)) {
      recommendations.push(
        investigate(service, "CROSS_SERVICE_ATTRIBUTION"),
      )
      continue
    }
    if (snapshot.tracking.state !== "GREEN" || !snapshot.tracking.scaleAllowed) {
      recommendations.push(hold(service, "TRACKING_NOT_GREEN"))
      continue
    }

    if (service === "scripts") {
      recommendations.push(evaluateScripts(campaign))
    } else if (service === "med_certs") {
      recommendations.push(evaluateMedCerts(campaign))
    } else {
      recommendations.push(evaluateSpecialty(service, campaign))
    }
  }

  const hasUnmappedEnabledCampaign = snapshot.rolling30.some(
    (campaign) =>
      campaign.channel === "SEARCH"
      && campaign.campaignStatus === "ENABLED"
      && resolveAdsCampaignService(campaign) == null,
  )
  if (hasUnmappedEnabledCampaign) {
    recommendations.unshift(
      investigate("account", "UNMAPPED_ENABLED_SEARCH_CAMPAIGN"),
    )
  }

  return recommendations
}
