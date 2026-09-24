import { describe, expect, it } from "vitest"

import type { GoogleAdsAccountState } from "@/lib/ads-agent/account-state"
import { campaignNegativeCoverage,negativeKeywordCovers } from "@/lib/ads-agent/negative-coverage"

const keyword = (text: string, matchType = "PHRASE") => ({ text, matchType })
const resource = (key: string, value: Record<string, unknown>) => ({ resourceName: "unused", values: { [key]: value } })
const empty = () => ({ campaignCriteria: [], sharedCriteria: [], sharedSets: [], campaignSharedSets: [], adGroups: [], adGroupCriteria: [] }) as unknown as GoogleAdsAccountState

describe("negative keyword coverage", () => {
  it("respects exact, phrase and broad token boundaries without close variants", () => {
    expect(negativeKeywordCovers(keyword("free"), keyword("free medical certificate", "EXACT"))).toBe(true)
    expect(negativeKeywordCovers(keyword("free"), keyword("freedom certificate", "EXACT"))).toBe(false)
    expect(negativeKeywordCovers(keyword("free", "EXACT"), keyword("free certificate", "EXACT"))).toBe(false)
    expect(negativeKeywordCovers(keyword("medical free", "BROAD"), keyword("free medical certificate"))).toBe(true)
    expect(negativeKeywordCovers(keyword("certificate"), keyword("certificates", "EXACT"))).toBe(false)
  })
  it("recognises enabled shared lists attached to the target campaign only", () => {
    const state = empty()
    state.sharedSets = [resource("sharedSet", { resourceName: "list/1", status: "ENABLED" })]
    state.sharedCriteria = [resource("sharedCriterion", { sharedSet: "list/1", keyword: keyword("free") })]
    state.campaignSharedSets = [resource("campaignSharedSet", { campaign: "campaign/1", sharedSet: "list/1", status: "ENABLED" })]
    expect(campaignNegativeCoverage(state, "campaign/1", keyword("free certificate", "EXACT"))).toBe(true)
    expect(campaignNegativeCoverage(state, "campaign/2", keyword("free certificate", "EXACT"))).toBe(false)
    state.campaignSharedSets[0].values.campaignSharedSet = { campaign: "campaign/1", sharedSet: "list/1", status: "REMOVED" }
    expect(campaignNegativeCoverage(state, "campaign/1", keyword("free certificate", "EXACT"))).toBe(false)
  })
  it("requires all nonremoved ad groups to be covered before rejecting a campaign exclusion", () => {
    const state = empty()
    state.adGroups = ["group/1", "group/2"].map((name) => resource("adGroup", { resourceName: name, campaign: "campaign/1", status: "ENABLED" }))
    state.adGroupCriteria = [resource("adGroupCriterion", { adGroup: "group/1", negative: true, status: "ENABLED", keyword: keyword("free") })]
    expect(campaignNegativeCoverage(state, "campaign/1", keyword("free", "EXACT"))).toBe(false)
    state.adGroupCriteria.push(resource("adGroupCriterion", { adGroup: "group/2", negative: true, status: "ENABLED", keyword: keyword("free") }))
    expect(campaignNegativeCoverage(state, "campaign/1", keyword("free", "EXACT"))).toBe(true)
    state.adGroupCriteria[0].values.adGroupCriterion = { adGroup: "group/1", negative: true, status: "REMOVED", keyword: keyword("free") }
    expect(campaignNegativeCoverage(state, "campaign/1", keyword("free", "EXACT"))).toBe(false)
  })
})
