import type { GoogleAdsAccountState } from "@/lib/ads-agent/account-state"

type Keyword = { text: string; matchType: string }
const record = (value: unknown): Record<string, unknown> =>
  value != null && typeof value === "object" ? value as Record<string, unknown> : {}
const tokens = (text: string) => text.normalize("NFKC").toLowerCase().trim().split(/\s+/)

/** Negative keywords do not match close variants. Never stem or use substrings. */
export function negativeKeywordCovers(existing: Keyword, proposed: Keyword): boolean {
  const left = tokens(existing.text)
  const right = tokens(proposed.text)
  if (!left[0] || !right[0]) return false
  if (existing.matchType === "EXACT") {
    return proposed.matchType === "EXACT" && left.join(" ") === right.join(" ")
  }
  if (existing.matchType === "BROAD") return left.every((token) => right.includes(token))
  if (existing.matchType !== "PHRASE" || proposed.matchType === "BROAD") return false
  return right.some((_, start) => left.every((token, offset) => right[start + offset] === token))
}

export function campaignNegativeCoverage(
  state: GoogleAdsAccountState,
  campaign: string,
  proposed: Keyword,
): boolean {
  const covers = (value: unknown) => {
    const keyword = record(value)
    return typeof keyword.text === "string" && typeof keyword.matchType === "string"
      && negativeKeywordCovers({ text: keyword.text, matchType: keyword.matchType }, proposed)
  }
  if (state.campaignCriteria.some(({ values }) => {
    const criterion = record(values.campaignCriterion)
    return criterion.campaign === campaign && criterion.negative === true
      && criterion.status === "ENABLED" && covers(criterion.keyword)
  })) return true

  const enabledLists = new Set(state.sharedSets.flatMap(({ values }) => {
    const set = record(values.sharedSet)
    return set.status === "ENABLED" ? [set.resourceName] : []
  }))
  const attachedLists = new Set(state.campaignSharedSets.flatMap(({ values }) => {
    const link = record(values.campaignSharedSet)
    return link.campaign === campaign && link.status === "ENABLED" && enabledLists.has(link.sharedSet)
      ? [link.sharedSet] : []
  }))
  if (state.sharedCriteria.some(({ values }) => {
    const criterion = record(values.sharedCriterion)
    return attachedLists.has(criterion.sharedSet) && covers(criterion.keyword)
  })) return true

  // One ad group's exclusion must not hide exposure in another or paused group.
  const groups = state.adGroups.flatMap(({ values, resourceName }) => {
    const group = record(values.adGroup)
    return group.campaign === campaign && group.status !== "REMOVED"
      ? [group.resourceName ?? resourceName] : []
  })
  return groups.length > 0 && groups.every((group) => state.adGroupCriteria.some(({ values }) => {
    const criterion = record(values.adGroupCriterion)
    return criterion.adGroup === group && criterion.negative === true
      && criterion.status === "ENABLED" && covers(criterion.keyword)
  }))
}
