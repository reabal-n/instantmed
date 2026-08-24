import "server-only"

import {
  type AdSchedule,
  hashAdsMutationOperations,
  normalizeAdsMutationOperations,
} from "@/lib/ads-agent/proposals"

export interface TrustedAdsOperationSummary {
  lines: string[]
  operationHash: string
}

function micros(value: number): string {
  return `${value} micros (A$${(value / 1_000_000).toFixed(2)})`
}

function numbered(values: string[]): string[] {
  return values.map((value, index) => `${index + 1}. ${JSON.stringify(value)}`)
}

const SCHEDULE_MINUTES: Record<AdSchedule["startMinute"], string> = {
  FIFTEEN: "15",
  FORTY_FIVE: "45",
  THIRTY: "30",
  ZERO: "00",
}

function scheduleTime(hour: number, minute: AdSchedule["startMinute"]): string {
  return `${String(hour).padStart(2, "0")}:${SCHEDULE_MINUTES[minute]}`
}

function schedules(label: string, values: AdSchedule[]): string[] {
  return [
    `${label} schedule (${values.length}):`,
    ...(values.length === 0
      ? ["none (no ad schedule criteria)"]
      : values.map((value, index) =>
          `${index + 1}. ${value.dayOfWeek} ${scheduleTime(value.startHour, value.startMinute)}-${scheduleTime(value.endHour, value.endMinute)}`
        )),
  ]
}

export function formatTrustedAdsOperationSummary(
  value: unknown,
): TrustedAdsOperationSummary {
  const operations = normalizeAdsMutationOperations(value)
  const lines = operations.flatMap((operation, index) => {
    const heading = `Operation ${index + 1}/${operations.length} · ${operation.kind}`

    if (operation.kind === "campaign_create") {
      return [
        heading,
        `Campaign: ${operation.campaignName}`,
        `Service: ${operation.service}`,
        `Status: ${operation.status}`,
        `Budget: A$${(operation.dailyBudgetMicros / 1_000_000).toFixed(2)}/day`,
        `Bid: A$${(operation.cpcBidMicros / 1_000_000).toFixed(2)} max CPC`,
        "Bidding: Manual CPC (enhanced CPC off)",
        "Networks: Google Search only (Search Partners and Display off)",
        `Targeting: Australia only (${operation.locationResourceName}); English (${operation.languageResourceName}); presence only`,
        "Shared exclusions: IM | Never Serve",
        `Final URL: ${operation.finalUrl}`,
        ...operation.adGroups.flatMap((adGroup, adGroupIndex) => [
          `Ad group ${adGroupIndex + 1}/${operation.adGroups.length}: ${adGroup.name}`,
          `Keywords (${adGroup.keywords.length}):`,
          ...adGroup.keywords.flatMap((keyword, keywordIndex) => [
            `${keywordIndex + 1}. ${keyword.matchType} ${JSON.stringify(keyword.text)}`,
            `   Policy exemptions: ${
              keyword.exemptPolicyViolationKeys.length > 0
                ? keyword.exemptPolicyViolationKeys
                    .map(({ policyName }) => policyName)
                    .join(", ")
                : "none"
            }`,
          ]),
          `Display paths: ${JSON.stringify(adGroup.responsiveSearchAd.path1)} / ${JSON.stringify(adGroup.responsiveSearchAd.path2)}`,
          `Headlines (${adGroup.responsiveSearchAd.headlines.length}):`,
          ...numbered(adGroup.responsiveSearchAd.headlines),
          `Descriptions (${adGroup.responsiveSearchAd.descriptions.length}):`,
          ...numbered(adGroup.responsiveSearchAd.descriptions),
        ]),
      ]
    }

    if (
      operation.kind === "campaign_status"
      || operation.kind === "ad_status"
      || operation.kind === "keyword_status"
      || operation.kind === "asset_link_status"
    ) {
      return [
        heading,
        `Resource: ${operation.resourceName}`,
        `Expected → next: ${operation.expected} → ${operation.next}`,
      ]
    }

    if (operation.kind === "campaign_budget") {
      return [
        heading,
        `Resource: ${operation.resourceName}`,
        `Expected → next: ${micros(operation.expectedMicros)} → ${micros(operation.nextMicros)}`,
      ]
    }

    if (operation.kind === "campaign_bidding") {
      return [
        heading,
        `Resource: ${operation.resourceName}`,
        `Expected → next: ${JSON.stringify(operation.expected)} → ${JSON.stringify(operation.next)}`,
      ]
    }

    if (operation.kind === "ad_group_cpc_bid") {
      return [
        heading,
        `Resource: ${operation.resourceName}`,
        `Expected → next: ${micros(operation.expectedMicros)} → ${micros(operation.nextMicros)}`,
      ]
    }

    if (operation.kind === "responsive_search_ad_create") {
      return [
        heading,
        `Ad group: ${operation.adGroupResourceName}`,
        `Status: ${operation.status}`,
        `Final URL: ${operation.finalUrl}`,
        `Display paths: ${JSON.stringify(operation.path1)} / ${JSON.stringify(operation.path2)}`,
        `Headlines (${operation.headlines.length}):`,
        ...numbered(operation.headlines),
        `Descriptions (${operation.descriptions.length}):`,
        ...numbered(operation.descriptions),
      ]
    }

    if (operation.kind === "positive_keyword_create") {
      return [
        heading,
        `Ad group: ${operation.adGroupResourceName}`,
        `Text: ${JSON.stringify(operation.text)}`,
        `Match type: ${operation.matchType}`,
        `Status: ${operation.status}`,
      ]
    }

    if (operation.kind === "negative_keyword") {
      return [
        heading,
        `Campaign: ${operation.campaignResourceName}`,
        `Text: ${JSON.stringify(operation.text)}`,
        `Match type: ${operation.matchType}`,
        "Status: ENABLED (negative criterion)",
      ]
    }

    if (operation.kind === "shared_negative_list") {
      return [
        heading,
        `Campaign: ${operation.campaignResourceName}`,
        `Shared exclusion list: ${operation.sharedSetResourceName}`,
        "Expected → next: not attached → attached",
        `Missing code-owned exclusions (${operation.keywords.length}):`,
        ...operation.keywords.map(
          ({ matchType, text }, keywordIndex) =>
            `${keywordIndex + 1}. ${matchType} ${JSON.stringify(text)}`,
        ),
      ]
    }

    if (operation.kind === "schedule_replace") {
      return [
        heading,
        `Campaign: ${operation.campaignResourceName}`,
        ...schedules("Expected", operation.expected),
        ...schedules("Next", operation.next),
      ]
    }

    const exhaustive: never = operation
    return [heading, `Unsupported operation: ${JSON.stringify(exhaustive)}`]
  })

  return {
    lines,
    operationHash: hashAdsMutationOperations(operations),
  }
}
