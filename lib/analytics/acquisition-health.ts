import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface GoogleAdsSummary {
  clicks: number
  cost: number
  impressions: number
  error?: string
}

export interface AcquisitionHealthResult {
  windowDays: number
  paidIntakes: number
  paidRevenue: number
  paidWithGoogleClickId: number
  paidWithUtmSource: number
  unknownPaidIntakes: number
  googleAds?: GoogleAdsSummary
  healthy: boolean
  alerts: string[]
}

function hasGoogleAdsReportingConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN,
  )
}

async function fetchGoogleAdsAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    throw new Error(`google_ads_token_${res.status}`)
  }

  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error("google_ads_token_missing")
  return json.access_token
}

async function fetchGoogleAdsSummary(since: Date): Promise<GoogleAdsSummary | undefined> {
  if (!hasGoogleAdsReportingConfig()) {
    return { clicks: 0, impressions: 0, cost: 0, error: "google_ads_reporting_not_configured" }
  }

  try {
    const accessToken = await fetchGoogleAdsAccessToken()
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
    const quotaProjectId = process.env.GOOGLE_ADS_QUOTA_PROJECT_ID
    const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22"
    const startDate = since.toISOString().slice(0, 10)
    const endDate = new Date().toISOString().slice(0, 10)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    }
    if (loginCustomerId) headers["login-customer-id"] = loginCustomerId
    if (quotaProjectId) headers["x-goog-user-project"] = quotaProjectId

    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `

    const res = await fetch(
      `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      },
    )

    if (!res.ok) {
      return { clicks: 0, impressions: 0, cost: 0, error: `google_ads_${res.status}` }
    }

    const chunks = (await res.json()) as Array<{
      results?: Array<{
        metrics?: { clicks?: string | number; impressions?: string | number; costMicros?: string | number }
      }>
    }>
    const metrics = chunks.flatMap((chunk) => chunk.results ?? [])[0]?.metrics ?? {}

    return {
      clicks: Number(metrics.clicks ?? 0),
      impressions: Number(metrics.impressions ?? 0),
      cost: Number(metrics.costMicros ?? 0) / 1_000_000,
    }
  } catch (error) {
    return {
      clicks: 0,
      impressions: 0,
      cost: 0,
      error: error instanceof Error ? error.message : "google_ads_unknown",
    }
  }
}

export async function getAcquisitionHealth(windowDays = 7): Promise<AcquisitionHealthResult> {
  const supabase = createServiceRoleClient()
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const [{ data: paidIntakes, error }, googleAds] = await Promise.all([
    supabase
      .from("intakes")
      .select("amount_cents, utm_source, gclid, gbraid, wbraid")
      .not("paid_at", "is", null)
      .gte("paid_at", since.toISOString()),
    fetchGoogleAdsSummary(since),
  ])

  if (error) {
    throw new Error(`acquisition_health_query_failed:${error.message}`)
  }

  const rows = paidIntakes ?? []
  const paidWithGoogleClickId = rows.filter((row) => row.gclid || row.gbraid || row.wbraid).length
  const paidWithUtmSource = rows.filter((row) => row.utm_source).length
  const unknownPaidIntakes = rows.filter(
    (row) => !row.utm_source && !row.gclid && !row.gbraid && !row.wbraid,
  ).length
  const paidRevenue = rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0) / 100

  const alerts: string[] = []
  if (googleAds && !googleAds.error && googleAds.clicks > 0 && rows.length > 0 && paidWithGoogleClickId === 0) {
    alerts.push("google_ads_clicks_but_no_paid_click_ids")
  }
  if (rows.length > 0 && unknownPaidIntakes / rows.length >= 0.5) {
    alerts.push("paid_attribution_unknown_over_50_percent")
  }
  if (googleAds?.error) {
    alerts.push("google_ads_reporting_unavailable")
  }

  return {
    windowDays,
    paidIntakes: rows.length,
    paidRevenue,
    paidWithGoogleClickId,
    paidWithUtmSource,
    unknownPaidIntakes,
    googleAds,
    healthy: alerts.length === 0,
    alerts,
  }
}
