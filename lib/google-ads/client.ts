import "server-only"

import { createLogger } from "@/lib/observability/logger"

export const DEFAULT_GOOGLE_ADS_API_VERSION = "v24"

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
const ACCESS_TOKEN_EXPIRY_SAFETY_MS = 60_000
const MAX_SEARCH_PAGES = 100

const logger = createLogger("google-ads-client")

interface AccessTokenCache {
  expiresAt: number
  token: string
}

export interface GoogleAdsClientConfig {
  apiVersion: string
  customerId: string
  developerToken: string
  loginCustomerId?: string
  quotaProjectId?: string
}

export type GoogleAdsSearchRow = Record<string, unknown>
export type GoogleAdsMutateOperation = Record<string, unknown>

export interface GoogleAdsMutateResponse {
  ok: boolean
  rawError: string | null
  requestId: string | null
  results: unknown[]
}

let tokenCache: AccessTokenCache | null = null

export function resetGoogleAdsAccessTokenCacheForTests(): void {
  tokenCache = null
}

export function normalizeGoogleAdsNumericId(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const resourceId = trimmed.match(/\/(\d+)$/)?.[1]
  const normalized = (resourceId || trimmed).replace(/-/g, "")
  return /^\d+$/.test(normalized) ? normalized : null
}

export function getGoogleAdsClientConfig(): GoogleAdsClientConfig | null {
  const customerId = normalizeGoogleAdsNumericId(
    process.env.GOOGLE_ADS_CUSTOMER_ID,
  )
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!customerId || !developerToken) return null

  return {
    apiVersion:
      process.env.GOOGLE_ADS_API_VERSION?.trim() ||
      DEFAULT_GOOGLE_ADS_API_VERSION,
    customerId,
    developerToken,
    loginCustomerId:
      normalizeGoogleAdsNumericId(
        process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      ) || undefined,
    quotaProjectId:
      process.env.GOOGLE_ADS_QUOTA_PROJECT_ID?.trim() || undefined,
  }
}

export function buildGoogleAdsAuthHeaders(
  config: GoogleAdsClientConfig,
  accessToken: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
  }

  if (config.loginCustomerId) {
    headers["login-customer-id"] = config.loginCustomerId
  }
  if (config.quotaProjectId) {
    headers["x-goog-user-project"] = config.quotaProjectId
  }

  return headers
}

export async function getGoogleAdsAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) return null

  if (
    tokenCache &&
    tokenCache.expiresAt > Date.now() + ACCESS_TOKEN_EXPIRY_SAFETY_MS
  ) {
    return tokenCache.token
  }

  try {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      logger.error("OAuth token refresh failed", { status: response.status })
      return null
    }

    const payload = (await response.json()) as {
      access_token?: string
      expires_in?: number
    }
    if (!payload.access_token) return null

    tokenCache = {
      token: payload.access_token,
      expiresAt:
        Date.now() +
        (Number.isFinite(payload.expires_in) ? payload.expires_in! : 3600) *
          1000,
    }
    return tokenCache.token
  } catch (error) {
    logger.error("OAuth token refresh threw", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export function getGoogleAdsSearchUrl(
  customerId: string,
  apiVersion =
    process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`
}

export function getGoogleAdsMutateUrl(
  customerId: string,
  apiVersion =
    process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:mutate`
}

function compactError(value: string, fallback: string): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9_.:-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96)

  return normalized || fallback
}

export function extractGoogleAdsErrorCode(
  responseBody: string,
  status: number,
): string {
  try {
    const parsed = JSON.parse(responseBody) as {
      error?: {
        details?: Array<{
          errors?: Array<{
            errorCode?: Record<string, string>
            message?: string
          }>
        }>
        message?: string
      }
      partialFailureError?: {
        details?: Array<{
          errors?: Array<{
            errorCode?: Record<string, string>
            message?: string
          }>
        }>
        message?: string
      }
    }

    const errorSource = parsed.error || parsed.partialFailureError
    const googleAdsError = errorSource?.details
      ?.flatMap((detail) => detail.errors || [])
      ?.find((error) => error.errorCode)

    if (googleAdsError?.errorCode) {
      const [namespace, code] =
        Object.entries(googleAdsError.errorCode)[0] || []
      const detail = [namespace, code, googleAdsError.message]
        .filter(Boolean)
        .join(":")
      return compactError(detail, `http_${status}`)
    }

    if (errorSource?.message) {
      return compactError(errorSource.message, `http_${status}`)
    }
  } catch {
    // Fall back to the status-only code below.
  }

  return `http_${status}`
}

async function readResponseBody(response: Response): Promise<string> {
  if (typeof response.text === "function") {
    return response.text()
  }

  // A narrow compatibility seam for existing unit mocks that predate the
  // shared client and implement json() only.
  if (typeof response.json === "function") {
    return JSON.stringify(await response.json())
  }

  return ""
}

export async function searchGoogleAds<
  T extends GoogleAdsSearchRow = GoogleAdsSearchRow,
>(query: string): Promise<T[]> {
  const config = getGoogleAdsClientConfig()
  if (!config) throw new Error("missing_env")
  if (!query.trim()) throw new Error("missing_query")

  const accessToken = await getGoogleAdsAccessToken()
  if (!accessToken) throw new Error("no_access_token")

  const results: T[] = []
  let pageToken: string | undefined

  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    const response = await fetch(
      getGoogleAdsSearchUrl(config.customerId, config.apiVersion),
      {
        method: "POST",
        headers: buildGoogleAdsAuthHeaders(config, accessToken),
        body: JSON.stringify({
          query,
          ...(pageToken ? { pageToken } : {}),
        }),
      },
    )
    const responseBody = await readResponseBody(response)

    if (!response.ok) {
      throw new Error(extractGoogleAdsErrorCode(responseBody, response.status))
    }

    const payload = responseBody
      ? (JSON.parse(responseBody) as {
          nextPageToken?: string
          results?: T[]
        })
      : {}

    if (Array.isArray(payload.results)) {
      results.push(...payload.results)
    }

    pageToken = payload.nextPageToken?.trim() || undefined
    if (!pageToken) return results
  }

  throw new Error("google_ads_search_page_limit_exceeded")
}

function failedMutation(
  rawError: string,
  requestId: string | null = null,
): GoogleAdsMutateResponse {
  return {
    ok: false,
    requestId,
    results: [],
    rawError,
  }
}

export async function mutateGoogleAds(args: {
  operations: GoogleAdsMutateOperation[]
  validateOnly: boolean
}): Promise<GoogleAdsMutateResponse> {
  const config = getGoogleAdsClientConfig()
  if (!config) return failedMutation("missing_env")
  if (args.operations.length === 0) return failedMutation("no_operations")

  const accessToken = await getGoogleAdsAccessToken()
  if (!accessToken) return failedMutation("no_access_token")

  try {
    const response = await fetch(
      getGoogleAdsMutateUrl(config.customerId, config.apiVersion),
      {
        method: "POST",
        headers: buildGoogleAdsAuthHeaders(config, accessToken),
        body: JSON.stringify({
          mutateOperations: args.operations,
          partialFailure: false,
          responseContentType: "MUTABLE_RESOURCE",
          validateOnly: args.validateOnly,
        }),
      },
    )
    const requestId = response.headers.get("request-id")
    const responseBody = await readResponseBody(response)

    if (!response.ok) {
      return failedMutation(
        responseBody || `http_${response.status}`,
        requestId,
      )
    }

    const payload = responseBody
      ? (JSON.parse(responseBody) as {
          mutateOperationResponses?: unknown[]
          results?: unknown[]
        })
      : {}

    return {
      ok: true,
      requestId,
      results: Array.isArray(payload.mutateOperationResponses)
        ? payload.mutateOperationResponses
        : Array.isArray(payload.results)
          ? payload.results
          : [],
      rawError: null,
    }
  } catch (error) {
    return failedMutation(
      error instanceof Error ? error.message : "google_ads_mutate_failed",
    )
  }
}
