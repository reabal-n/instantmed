/**
 * Derive a paid-channel source/medium from a non-Google ad click id.
 *
 * Google clicks (gclid/gbraid/wbraid) and ValueTrack params are already
 * captured and persisted to their own intake columns. But a click from Meta
 * (fbclid), Microsoft (msclkid), TikTok (ttclid), or LinkedIn (li_fat_id)
 * carries no utm_source by default, so the order would otherwise land as
 * "direct" and the spend would be invisible.
 *
 * We do NOT persist the raw non-Google click id (no DB column, and the
 * `normalizeAttribution` whitelist would drop it). Instead we map the click id
 * to a `utm_source` / `utm_medium` pair — both of which DO have columns and are
 * understood by `classifyAttributionSource` as `other_paid`. So any future
 * non-Google paid traffic is attributed to its channel from day one, with no
 * migration. (Raw-click-id capture for a Meta/TikTok offline conversion API
 * would be a separate, column-adding change.)
 */

type ParamLookup = { get(key: string): string | null | undefined }

// Order matters: the earliest match wins when several click ids are present.
const NON_GOOGLE_CLICK_ID_CHANNELS: ReadonlyArray<{
  param: string
  utm_source: string
  utm_medium: string
}> = [
  { param: "fbclid", utm_source: "facebook", utm_medium: "paid" },
  { param: "msclkid", utm_source: "bing", utm_medium: "cpc" },
  { param: "ttclid", utm_source: "tiktok", utm_medium: "paid" },
  { param: "li_fat_id", utm_source: "linkedin", utm_medium: "paid" },
]

const GOOGLE_CLICK_ID_PARAMS = ["gclid", "gbraid", "wbraid"] as const

function present(params: ParamLookup, key: string): boolean {
  return Boolean(params.get(key)?.trim())
}

export function deriveChannelFromClickIds(
  params: ParamLookup,
): { utm_source: string; utm_medium: string } | null {
  // Google clicks are owned by the existing gclid/ValueTrack pipeline.
  if (GOOGLE_CLICK_ID_PARAMS.some((key) => present(params, key))) return null

  for (const channel of NON_GOOGLE_CLICK_ID_CHANNELS) {
    if (present(params, channel.param)) {
      return { utm_source: channel.utm_source, utm_medium: channel.utm_medium }
    }
  }

  return null
}
