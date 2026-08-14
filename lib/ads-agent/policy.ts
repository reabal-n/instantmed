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
  attribution: {
    minimumExpectedServiceOrderShare: 0.90,
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

type CampaignServiceIdentity = Pick<CampaignEconomics, "campaignName">
  & Partial<Pick<CampaignEconomics, "serviceOrders">>

function normalizedCampaignName(campaign: CampaignServiceIdentity): string {
  return campaign.campaignName
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
}

export function resolveAdsCampaignService(
  campaign: CampaignServiceIdentity,
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

  const attributedServices = Object.entries(campaign.serviceOrders ?? {})
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

function campaignHasMaterialCrossServiceOrders(
  campaign: CampaignEconomics,
  expectedService: AdsService,
): boolean {
  let expectedServiceOrders = 0
  let recognizedServiceOrders = 0

  for (const [service, orders] of Object.entries(campaign.serviceOrders)) {
    if (
      orders <= 0
      || !SERVICE_ORDER.includes(service as (typeof SERVICE_ORDER)[number])
    ) {
      continue
    }
    recognizedServiceOrders += orders
    if (service === expectedService) expectedServiceOrders += orders
  }

  if (recognizedServiceOrders === expectedServiceOrders) return false
  return expectedServiceOrders / recognizedServiceOrders
    < POLICY.attribution.minimumExpectedServiceOrderShare
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
 * Attribution Investigation Holds — code-owned enforcement of the durable
 * operator boundary in CONTEXT.md ("Attribution Investigation Hold") and
 * docs/ROADMAP.md §Google Ads attribution-hold clearance.
 *
 * The per-run CROSS_SERVICE_ATTRIBUTION check inside the loop is a single-day
 * signal: once the daily share recovers, that branch stops firing and nothing
 * carries the investigation forward — a later GREEN day could emit
 * SCRIPTS_SCALE_GATES_PASSED while the cause was never established. This set
 * is the durable memory: a listed service always evaluates to
 * INVESTIGATE / ATTRIBUTION_INVESTIGATION_HOLD, whatever today's share,
 * campaign mapping, or tracking state says.
 *
 * Clearing is an Attribution Investigation Resolution (CONTEXT.md): recorded
 * cause, completed correction, and fresh rolling 30-day evidence at >= 90%
 * expected-service attribution across >= 10 recognised orders — then remove
 * the service here in a reviewed code change (the same code-owned governance
 * pattern as lib/clinical/auto-approval-governance.ts). Threshold recovery
 * alone never clears it.
 *
 * Resolved holds:
 * - scripts (resolved 2026-08-15): ED and hair-loss purchases had surfaced
 *   through the $29.95 Scripts lane. The dedicated-service hard routing
 *   shipped 2026-08-05/06. A fresh closed 30-day window ending 2026-08-14
 *   then showed 70 expected Scripts orders out of 72 recognised orders
 *   (97.2%), above the >= 90% / >= 10-order clearance gate. The Operator
 *   recorded the Attribution Investigation Resolution on 2026-08-15.
 */
const OPEN_ATTRIBUTION_HOLDS: ReadonlySet<Exclude<AdsService, "account">> =
  new Set()

interface EvaluateAdsPolicyOptions {
  /** Test seam only — production callers use the code-owned default. */
  openAttributionHolds?: ReadonlySet<Exclude<AdsService, "account">>
}

/**
 * Evaluates campaign-level economics only. Portfolio totals are intentionally
 * not used for service decisions so a profitable Scripts campaign can never
 * subsidise or conceal a losing specialty pilot.
 */
export function evaluateAdsPolicy(
  snapshot: AdsAgentSnapshot,
  options?: EvaluateAdsPolicyOptions,
): AdsRecommendation[] {
  const openAttributionHolds = options?.openAttributionHolds ?? OPEN_ATTRIBUTION_HOLDS
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
    // Durable hold wins over EVERYTHING for the service — including a missing
    // or multiple campaign mapping and a recovered daily share — so it stays
    // visible until an explicit recorded resolution removes it.
    if (openAttributionHolds.has(service)) {
      recommendations.push(investigate(service, "ATTRIBUTION_INVESTIGATION_HOLD"))
      continue
    }

    const serviceCampaigns = campaigns.get(service) ?? []
    if (serviceCampaigns.length === 0) continue
    if (serviceCampaigns.length > 1) {
      recommendations.push(
        investigate(service, "MULTIPLE_SERVICE_CAMPAIGNS"),
      )
      continue
    }

    const campaign = serviceCampaigns[0]
    if (campaignHasMaterialCrossServiceOrders(campaign, service)) {
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
