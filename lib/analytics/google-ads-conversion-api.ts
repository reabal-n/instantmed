import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("google-ads-conversion-api")

/**
 * Server-side Google Ads Conversion API client.
 *
 * Why: browser-side gtag misses ~30% of attribution on iOS Safari (ITP blocks
 * third-party cookies) and other privacy-restricted contexts. Firing the same
 * conversion server-side using the gclid stored at intake submit time recovers
 * that loss. Google deduplicates on `order_id` so duplicate fires from browser
 * + server are safe.
 *
 * Required env vars (all must be present for the call to fire):
 *   GOOGLE_ADS_CUSTOMER_ID            - 10-digit customer id, no dashes
 *   GOOGLE_ADS_DEVELOPER_TOKEN        - the developer token from API Center
 *   GOOGLE_ADS_OAUTH_CLIENT_ID        - OAuth 2.0 client id from GCP console
 *   GOOGLE_ADS_OAUTH_CLIENT_SECRET    - OAuth 2.0 client secret
 *   GOOGLE_ADS_OAUTH_REFRESH_TOKEN    - long-lived refresh token (one-time
 *                                       OAuth grant; persist securely)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID      - optional MCC id when the customer is
 *                                       under a manager account
 *
 * Conversion action env vars (one per action you want to fire server-side):
 *   GOOGLE_ADS_CONVERSION_ACTION_PURCHASE        - resource name path segment
 *                                                  e.g. "1234567890" (just the id)
 *
 * If any required env var is missing the call no-ops with a warn log. The
 * intake flow is never blocked by Conversion API failures.
 */

interface FireConversionInput {
  /** Stable per-purchase order id used by Google for dedup against browser fires. */
  orderId: string
  /** gclid stored on the intake row. */
  gclid?: string | null
  /** gbraid - alternative click id for iOS app→web flows. */
  gbraid?: string | null
  /** wbraid - alternative click id for web→app flows. */
  wbraid?: string | null
  /** Conversion value in account currency (AUD). */
  value: number
  /** ISO timestamp when the conversion happened. Defaults to now. */
  conversionDateTime?: Date
}

interface AccessTokenCache {
  token: string
  expiresAt: number
}

let tokenCache: AccessTokenCache | null = null

async function fetchAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_OAUTH_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) return null

  // Reuse cached token while it has more than 60s of validity
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!res.ok) {
      logger.error("OAuth token refresh failed", { status: res.status })
      return null
    }

    const json = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) return null

    tokenCache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    }
    return tokenCache.token
  } catch (err) {
    logger.error("OAuth token refresh threw", {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

function formatGoogleAdsDateTime(d: Date): string {
  // Google requires "yyyy-MM-dd HH:mm:ss+TZ" e.g. "2026-04-28 12:00:00+10:00"
  const pad = (n: number) => String(n).padStart(2, "0")
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? "+" : "-"
  const absOff = Math.abs(offsetMin)
  const offHr = pad(Math.floor(absOff / 60))
  const offMn = pad(absOff % 60)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${offHr}:${offMn}`
  )
}

/**
 * Fire a server-side Google Ads conversion for a completed purchase.
 *
 * No-ops cleanly if env vars are not yet configured. Returns true if the
 * call was attempted (independent of API success), false if skipped.
 */
export async function fireGoogleAdsPurchaseConversion(
  input: FireConversionInput,
): Promise<{ attempted: boolean; ok?: boolean; error?: string }> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

  if (!customerId || !developerToken || !conversionActionId) {
    logger.warn("Google Ads Conversion API skipped - missing env vars", {
      hasCustomerId: !!customerId,
      hasDeveloperToken: !!developerToken,
      hasConversionActionId: !!conversionActionId,
    })
    return { attempted: false }
  }

  if (!input.gclid && !input.gbraid && !input.wbraid) {
    // No click identifier - this conversion didn't originate from a Google ad
    // click, so there's nothing for the Conversion API to attribute to.
    return { attempted: false }
  }

  const accessToken = await fetchAccessToken()
  if (!accessToken) {
    logger.warn("Google Ads Conversion API skipped - failed to get access token")
    return { attempted: false, error: "no_access_token" }
  }

  const conversionDateTime = formatGoogleAdsDateTime(input.conversionDateTime ?? new Date())

  const body = {
    conversions: [
      {
        conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
        ...(input.gclid ? { gclid: input.gclid } : {}),
        ...(input.gbraid ? { gbraid: input.gbraid } : {}),
        ...(input.wbraid ? { wbraid: input.wbraid } : {}),
        conversionDateTime,
        conversionValue: input.value,
        currencyCode: "AUD",
        orderId: input.orderId,
      },
    ],
    partialFailureEnabled: true,
  }

  try {
    const url = `https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
    }
    if (loginCustomerId) headers["login-customer-id"] = loginCustomerId

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const responseBody = await res.text()

    if (!res.ok) {
      logger.error("Google Ads Conversion API call failed", {
        status: res.status,
        body: responseBody.slice(0, 500),
      })
      Sentry.captureMessage("Google Ads Conversion API non-200", {
        level: "warning",
        extra: {
          orderId: input.orderId,
          status: res.status,
          body: responseBody.slice(0, 500),
        },
      })
      return { attempted: true, ok: false, error: `http_${res.status}` }
    }

    // Partial failures come back in the response body even with 200. Parse and
    // log so we surface them.
    let parsed: unknown
    try {
      parsed = JSON.parse(responseBody)
    } catch {
      parsed = null
    }
    const partialFailure =
      typeof parsed === "object" && parsed !== null && "partialFailureError" in parsed
        ? (parsed as { partialFailureError?: { message?: string } }).partialFailureError
        : undefined
    if (partialFailure?.message) {
      logger.warn("Google Ads Conversion API partial failure", {
        orderId: input.orderId,
        message: partialFailure.message,
      })
    } else {
      logger.info("Google Ads Conversion API success", { orderId: input.orderId })
    }

    return { attempted: true, ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Google Ads Conversion API threw", { orderId: input.orderId, error: message })
    Sentry.captureException(err, { tags: { route: "google-ads-conversion-api" } })
    return { attempted: true, ok: false, error: message }
  }
}
