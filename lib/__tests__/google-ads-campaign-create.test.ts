import { describe, expect, it } from "vitest"

import type { GoogleAdsAccountState } from "@/lib/ads-agent/account-state"
import {
  buildGoogleAdsMutateOperations,
  validateAdsMutationPolicy,
} from "@/lib/ads-agent/mutations"
import { PROHIBITED_PAID_MEDICINE_TERMS } from "@/lib/ads-agent/policy"
import {
  type AdsMutationOperation,
  normalizeAdsMutationOperations,
} from "@/lib/ads-agent/proposals"
import { formatTrustedAdsOperationSummary } from "@/lib/ads-agent/trusted-operation-summary"

const sharedSetResourceName = "customers/123/sharedSets/999"

const campaignCreateOperation = {
  adGroups: [
    {
      keywords: [
        {
          exemptPolicyViolationKeys: [],
          matchType: "EXACT",
          text: "online uti assessment",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "HEALTH_IN_PERSONALIZED_ADS",
            violatingText: "uti doctor online",
          }],
          matchType: "PHRASE",
          text: "uti doctor online",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "HEALTH_IN_PERSONALIZED_ADS",
            violatingText: "telehealth uti assessment",
          }],
          matchType: "EXACT",
          text: "telehealth uti assessment",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "HEALTH_IN_PERSONALIZED_ADS",
            violatingText: "online doctor for uti",
          }],
          matchType: "PHRASE",
          text: "online doctor for uti",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "HEALTH_IN_PERSONALIZED_ADS",
            violatingText: "urinary tract infection doctor",
          }],
          matchType: "EXACT",
          text: "urinary tract infection doctor",
        },
        {
          exemptPolicyViolationKeys: [],
          matchType: "PHRASE",
          text: "uti treatment online",
        },
      ],
      name: "AG | UTI Assessment",
      responsiveSearchAd: {
        descriptions: [
          "Complete a secure UTI symptom form. An Australian doctor reviews what happens next.",
          "Red-flag screening comes first. The doctor may call if more detail is needed.",
          "One-off doctor review from $49.95. Full refund if the doctor declines.",
          "For suitable adults in Australia. Urgent or complex symptoms need in-person care.",
        ],
        headlines: [
          "Online UTI Assessment",
          "Australian Doctor Review",
          "Start With A Secure Form",
          "UTI Symptoms Reviewed Online",
          "Clear Safety Screening",
          "One-Off Doctor Review",
          "From $49.95",
          "Full Refund If Declined",
        ],
        path1: "womens-health",
        path2: "uti-review",
      },
    },
    {
      keywords: [
        {
          exemptPolicyViolationKeys: [],
          matchType: "EXACT",
          text: "contraception assessment online",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "BIRTH_CONTROL",
            violatingText: "contraceptive pill assessment",
          }],
          matchType: "PHRASE",
          text: "contraceptive pill assessment",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "BIRTH_CONTROL",
            violatingText: "online contraception doctor",
          }],
          matchType: "EXACT",
          text: "online contraception doctor",
        },
        {
          exemptPolicyViolationKeys: [
            {
              policyName: "PRESCRIPTION_DRUG_SALE",
              violatingText: "start contraceptive pill online",
            },
            {
              policyName: "BIRTH_CONTROL",
              violatingText: "start contraceptive pill online",
            },
          ],
          matchType: "PHRASE",
          text: "start contraceptive pill online",
        },
        {
          exemptPolicyViolationKeys: [{
            policyName: "BIRTH_CONTROL",
            violatingText: "switch contraceptive pill online",
          }],
          matchType: "PHRASE",
          text: "switch contraceptive pill online",
        },
        {
          exemptPolicyViolationKeys: [],
          matchType: "EXACT",
          text: "online pill consultation",
        },
      ],
      name: "AG | Contraception Assessment",
      responsiveSearchAd: {
        descriptions: [
          "Complete a secure health form to start or switch the pill after doctor review.",
          "Your doctor checks prescribing safety and may call if more detail is needed.",
          "One-off doctor review from $49.95. Full refund if the doctor declines.",
          "The doctor decides whether prescribing is clinically appropriate.",
        ],
        headlines: [
          "Contraception Assessment",
          "Start Or Switch The Pill",
          "Australian Doctor Review",
          "Secure Online Health Form",
          "Prescribing Safety First",
          "One-Off Doctor Review",
          "From $49.95",
          "Full Refund If Declined",
        ],
        path1: "womens-health",
        path2: "contraception",
      },
    },
  ],
  campaignName: "IM | Search | Women's Health | AU",
  cpcBidMicros: 3_000_000,
  dailyBudgetMicros: 20_000_000,
  finalUrl: "https://instantmed.com.au/womens-health",
  kind: "campaign_create",
  languageResourceName: "languageConstants/1000",
  locationResourceName: "geoTargetConstants/2036",
  service: "womens_health",
  status: "ENABLED",
} as unknown as AdsMutationOperation

function accountState(
  overrides: Partial<GoogleAdsAccountState> = {},
): GoogleAdsAccountState {
  return {
    adGroupCriteria: [],
    adGroups: [],
    assets: [],
    biddingStrategies: [],
    campaignAssets: [],
    campaignBudgets: [],
    campaignCriteria: [],
    campaignSharedSets: [],
    campaigns: [],
    changeEvents: [],
    conversionActions: [],
    conversionGoals: [],
    customer: {
      autoTaggingEnabled: true,
      currencyCode: "AUD",
      finalUrlSuffix: "utm_source=google&utm_medium=cpc",
      id: "123",
      resourceName: "customers/123",
      timeZone: "Australia/Sydney",
    },
    customerClientLinks: [],
    customerManagerLinks: [],
    customerUserAccess: [],
    optionalQueryFailures: [],
    readAt: "2026-08-18T04:00:00.000Z",
    responsiveSearchAds: [],
    sharedCriteria: PROHIBITED_PAID_MEDICINE_TERMS.map((text, index) => ({
      resourceName: `customers/123/sharedCriteria/999~${index + 1}`,
      values: {
        sharedCriterion: {
          keyword: { matchType: "BROAD", text },
          resourceName: `customers/123/sharedCriteria/999~${index + 1}`,
          sharedSet: sharedSetResourceName,
          type: "KEYWORD",
        },
      },
    })),
    sharedSets: [{
      resourceName: sharedSetResourceName,
      values: {
        sharedSet: {
          name: "IM | Never Serve",
          resourceName: sharedSetResourceName,
          status: "ENABLED",
          type: "NEGATIVE_KEYWORDS",
        },
      },
    }],
    ...overrides,
  }
}

describe("Google Ads campaign creation boundary", () => {
  it("normalizes one bounded medicine-free Search campaign launch", () => {
    expect(normalizeAdsMutationOperations([campaignCreateOperation]))
      .toEqual([campaignCreateOperation])
  })

  it("rejects broad, medicine-name, duplicate, and malformed launch content", () => {
    const base = campaignCreateOperation as unknown as Record<string, unknown>
    const groups = structuredClone(base.adGroups) as Array<Record<string, unknown>>
    const first = groups[0]
    const keywords = first.keywords as Array<Record<string, unknown>>

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      adGroups: [{
        ...first,
        keywords: [{ ...keywords[0], matchType: "BROAD" }],
      }],
    }])).toThrow("Invalid matchType")

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      adGroups: [{
        ...first,
        keywords: [{
          ...keywords[0],
          exemptPolicyViolationKeys: [],
          text: "nitrofurantoin online",
        }],
      }],
    }])).toThrow("Medicine-name keywords are prohibited")

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      adGroups: [first, {
        ...structuredClone(first),
        keywords: [{
          exemptPolicyViolationKeys: [],
          matchType: "EXACT",
          text: "different valid keyword",
        }],
      }],
    }])).toThrow("Campaign ad group names must be unique")

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      finalUrl: "https://example.com/womens-health",
    }])).toThrow("Invalid paid destination")

    expect(() => normalizeAdsMutationOperations([
      campaignCreateOperation,
      campaignCreateOperation,
    ])).toThrow("exactly one campaign_create operation")

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      adGroups: [{
        ...first,
        keywords: [{
          ...keywords[1],
          exemptPolicyViolationKeys: [{
            policyName: "UNEXPECTED_POLICY",
            violatingText: "uti doctor online",
          }],
        }],
      }],
    }])).toThrow("Invalid policyName")

    expect(() => normalizeAdsMutationOperations([{
      ...base,
      adGroups: [{
        ...first,
        keywords: [{
          ...keywords[1],
          exemptPolicyViolationKeys: [{
            policyName: "HEALTH_IN_PERSONALIZED_ADS",
            violatingText: "different text",
          }],
        }],
      }],
    }])).toThrow("must match the keyword")
  })

  it("enforces the approved Women's Health pilot constitution", () => {
    const state = accountState()
    expect(() => validateAdsMutationPolicy({
      operations: [campaignCreateOperation],
      state,
    })).not.toThrow()

    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...campaignCreateOperation as unknown as Record<string, unknown>,
        dailyBudgetMicros: 20_000_001,
      }],
      state,
    })).toThrow("service_budget_ceiling_exceeded")

    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...campaignCreateOperation as unknown as Record<string, unknown>,
        cpcBidMicros: 3_000_001,
      }],
      state,
    })).toThrow("specialty_cpc_ceiling_exceeded")
  })

  it("requires the account medicine-exclusion list for every new campaign", () => {
    expect(() => validateAdsMutationPolicy({
      operations: [campaignCreateOperation],
      state: accountState({ sharedSets: [] }),
    })).toThrow("required_shared_negative_list_missing")
  })

  it("requires every code-owned medicine exclusion before campaign launch", () => {
    expect(() => validateAdsMutationPolicy({
      operations: [campaignCreateOperation],
      state: accountState({ sharedCriteria: [] }),
    })).toThrow("required_shared_negative_terms_missing")
  })

  it("builds the entire launch as one temporary-name atomic request", () => {
    const operations = buildGoogleAdsMutateOperations(
      [campaignCreateOperation],
      accountState(),
    )

    expect(operations).toHaveLength(21)
    expect(operations[0]).toEqual({
      campaignBudgetOperation: {
        create: {
          amountMicros: "20000000",
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
          resourceName: "customers/123/campaignBudgets/-1",
        },
      },
    })
    expect(operations[1]).toEqual({
      campaignOperation: {
        create: {
          advertisingChannelType: "SEARCH",
          campaignBudget: "customers/123/campaignBudgets/-1",
          containsEuPoliticalAdvertising:
            "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          geoTargetTypeSetting: {
            negativeGeoTargetType: "PRESENCE",
            positiveGeoTargetType: "PRESENCE",
          },
          manualCpc: { enhancedCpcEnabled: false },
          name: "IM | Search | Women's Health | AU",
          networkSettings: {
            targetContentNetwork: false,
            targetGoogleSearch: true,
            targetPartnerSearchNetwork: false,
            targetSearchNetwork: false,
          },
          resourceName: "customers/123/campaigns/-2",
          status: "ENABLED",
        },
      },
    })
    expect(operations.slice(2, 4)).toEqual([
      {
        campaignCriterionOperation: {
          create: {
            campaign: "customers/123/campaigns/-2",
            location: { geoTargetConstant: "geoTargetConstants/2036" },
            negative: false,
            status: "ENABLED",
          },
        },
      },
      {
        campaignCriterionOperation: {
          create: {
            campaign: "customers/123/campaigns/-2",
            language: { languageConstant: "languageConstants/1000" },
            negative: false,
            status: "ENABLED",
          },
        },
      },
    ])
    expect(operations[4]).toEqual({
      campaignSharedSetOperation: {
        create: {
          campaign: "customers/123/campaigns/-2",
          sharedSet: sharedSetResourceName,
        },
      },
    })
    expect(operations.slice(5, 7)).toEqual([
      expect.objectContaining({
        adGroupOperation: {
          create: expect.objectContaining({
            campaign: "customers/123/campaigns/-2",
            cpcBidMicros: "3000000",
            name: "AG | UTI Assessment",
            resourceName: "customers/123/adGroups/-3",
            status: "ENABLED",
            type: "SEARCH_STANDARD",
          }),
        },
      }),
      expect.objectContaining({
        adGroupOperation: {
          create: expect.objectContaining({
            campaign: "customers/123/campaigns/-2",
            cpcBidMicros: "3000000",
            name: "AG | Contraception Assessment",
            resourceName: "customers/123/adGroups/-4",
            status: "ENABLED",
            type: "SEARCH_STANDARD",
          }),
        },
      }),
    ])
    expect(operations.slice(7, 9).every((operation) =>
      "adGroupAdOperation" in operation)).toBe(true)
    expect(operations.slice(9).every((operation) =>
      "adGroupCriterionOperation" in operation)).toBe(true)
    expect(operations[10]).toEqual(expect.objectContaining({
      adGroupCriterionOperation: expect.objectContaining({
        exemptPolicyViolationKeys: [{
          policyName: "HEALTH_IN_PERSONALIZED_ADS",
          violatingText: "uti doctor online",
        }],
      }),
    }))
    expect(operations[18]).toEqual(expect.objectContaining({
      adGroupCriterionOperation: expect.objectContaining({
        exemptPolicyViolationKeys: [
          {
            policyName: "PRESCRIPTION_DRUG_SALE",
            violatingText: "start contraceptive pill online",
          },
          {
            policyName: "BIRTH_CONTROL",
            violatingText: "start contraceptive pill online",
          },
        ],
      }),
    }))
  })

  it("renders the complete launch in the trusted approval summary", () => {
    const summary = formatTrustedAdsOperationSummary([
      campaignCreateOperation,
    ]).lines.join("\n")

    expect(summary).toContain("A$20.00/day")
    expect(summary).toContain("A$3.00 max CPC")
    expect(summary).toContain("Australia only")
    expect(summary).toContain("Shared exclusions: IM | Never Serve")
    expect(summary).toContain("AG | UTI Assessment")
    expect(summary).toContain("online uti assessment")
    expect(summary).toContain("AG | Contraception Assessment")
    expect(summary).toContain("contraception assessment online")
    expect(summary).toContain("Policy exemptions: HEALTH_IN_PERSONALIZED_ADS")
    expect(summary).toContain(
      "Policy exemptions: PRESCRIPTION_DRUG_SALE, BIRTH_CONTROL",
    )
    expect(summary).toContain("https://instantmed.com.au/womens-health")
    expect(Array.from(summary).length).toBeLessThan(3_600)
  })

  it("renders every shared exclusion-list repair in the approval summary", () => {
    const summary = formatTrustedAdsOperationSummary([{
      campaignResourceName: "customers/123/campaigns/456",
      kind: "shared_negative_list",
      keywords: [
        { matchType: "BROAD", text: "nitrofurantoin" },
        { matchType: "BROAD", text: "trimethoprim" },
      ],
      sharedSetResourceName,
    }]).lines.join("\n")

    expect(summary).toContain("Shared exclusion list")
    expect(summary).toContain('BROAD "nitrofurantoin"')
    expect(summary).toContain('BROAD "trimethoprim"')
  })
})
