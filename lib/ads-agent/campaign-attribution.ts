import "server-only"

import {
  type GoogleAdsAttributionRow,
  isLikelyGoogleAttributed,
} from "@/lib/analytics/google-ads-post-payment"

export const UNMAPPED_GOOGLE_ADS_CAMPAIGN_ID = "google_ads_unmapped"

/** Canonical Google campaign ID normalization shared by spend and purchase reads. */
export function normalizeGoogleAdsCampaignId(value: unknown): string | null {
  const text = typeof value === "string"
    ? value.trim()
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : ""
  const candidate = text.replace(/-/g, "")
  return candidate && /^\d+$/.test(candidate) ? candidate : null
}

/** A campaign-shaped UTM alone is not evidence that a purchase came from Google Ads. */
export function resolveGoogleAdsPurchaseCampaignId(row: GoogleAdsAttributionRow): string | null {
  if (!isLikelyGoogleAttributed(row)) return null
  return normalizeGoogleAdsCampaignId(row.campaignid)
    || normalizeGoogleAdsCampaignId(row.utm_id)
    || UNMAPPED_GOOGLE_ADS_CAMPAIGN_ID
}
