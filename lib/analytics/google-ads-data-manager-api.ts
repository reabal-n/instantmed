import "server-only"

import * as Sentry from "@sentry/nextjs"

import {
  type GoogleAdsConversionUploadResult,
  type GoogleAdsEnhancedUserData,
  hashEmailForGoogleAds,
  hashPhoneForGoogleAds,
  selectGoogleAdsClickIdentifier,
} from "@/lib/analytics/google-ads-conversion-api"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("google-ads-data-manager-api")

const DATA_MANAGER_INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest"
const DATA_MANAGER_REQUEST_STATUS_URL = "https://datamanager.googleapis.com/v1/requestStatus:retrieve"

type DataManagerAccountType = "GOOGLE_ADS"
type DataManagerConsentStatus = "CONSENT_GRANTED" | "CONSENT_DENIED"

type DataManagerProductAccount = {
  accountId: string
  accountType: DataManagerAccountType
}

type DataManagerDestination = {
  loginAccount?: DataManagerProductAccount
  operatingAccount: DataManagerProductAccount
  productDestinationId: string
}

type DataManagerUserIdentifier =
  | { emailAddress: string }
  | { phoneNumber: string }

type DataManagerEvent = {
  adIdentifiers?: {
    gbraid?: string
    gclid?: string
    wbraid?: string
  }
  consent?: {
    adUserData: DataManagerConsentStatus
  }
  conversionValue: number
  currency: "AUD"
  eventSource: "WEB"
  eventTimestamp: string
  transactionId: string
  userData?: {
    userIdentifiers: DataManagerUserIdentifier[]
  }
}

export type GoogleAdsDataManagerIngestRequest = {
  destinations: DataManagerDestination[]
  encoding: "HEX"
  events: DataManagerEvent[]
  validateOnly?: boolean
}

type FireDataManagerConversionInput = {
  orderId: string
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  value: number
  conversionDateTime?: Date
  userData?: GoogleAdsEnhancedUserData | null
}

type DataManagerConfig = {
  clientId: string
  clientSecret: string
  conversionActionId: string
  customerId: string
  loginCustomerId?: string
  quotaProjectId?: string
  refreshToken: string
}

type DataManagerAuthConfig = Pick<
  DataManagerConfig,
  "clientId" | "clientSecret" | "quotaProjectId" | "refreshToken"
>

type AccessTokenCache = {
  expiresAt: number
  token: string
}

export type GoogleDataManagerRequestStatusResult = {
  attempted: boolean
  ok?: boolean
  error?: string
  requestStatusPerDestination?: unknown[]
  status?: string | null
}

let tokenCache: AccessTokenCache | null = null

export function resetGoogleDataManagerAccessTokenCacheForTests(): void {
  tokenCache = null
}

export function isGoogleDataManagerConversionsEnabled(): boolean {
  return process.env.GOOGLE_DATA_MANAGER_CONVERSIONS_ENABLED === "true"
}

function clean(value?: string | null): string {
  return value?.trim() ?? ""
}

function normalizeGoogleNumericId(value?: string | null): string | null {
  const trimmed = clean(value)
  if (!trimmed) return null

  const resourceId = trimmed.match(/\/(\d+)$/)?.[1]
  const normalized = (resourceId || trimmed).replace(/-/g, "")
  return /^\d+$/.test(normalized) ? normalized : null
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

function getGoogleDataManagerAuthConfig(): DataManagerAuthConfig | null {
  const clientId = clean(process.env.GOOGLE_DATA_MANAGER_CLIENT_ID)
  const clientSecret = clean(process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET)
  const refreshToken = clean(process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN)
  if (!clientId || !clientSecret || !refreshToken) return null

  return {
    clientId,
    clientSecret,
    quotaProjectId: clean(process.env.GOOGLE_DATA_MANAGER_QUOTA_PROJECT_ID) || undefined,
    refreshToken,
  }
}

function getGoogleDataManagerConfig(): DataManagerConfig | null {
  const authConfig = getGoogleDataManagerAuthConfig()
  const customerId = normalizeGoogleNumericId(process.env.GOOGLE_ADS_CUSTOMER_ID)
  const conversionActionId = normalizeGoogleNumericId(process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE)

  if (!authConfig || !customerId || !conversionActionId) return null

  return {
    conversionActionId,
    customerId,
    ...authConfig,
    loginCustomerId: normalizeGoogleNumericId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) || undefined,
  }
}

async function fetchGoogleDataManagerAccessToken(config: DataManagerAuthConfig): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      logger.error("Data Manager OAuth token refresh failed", { status: response.status })
      return null
    }

    const json = await response.json() as { access_token?: string; expires_in?: number }
    if (!json.access_token) return null

    tokenCache = {
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
      token: json.access_token,
    }
    return tokenCache.token
  } catch (error) {
    logger.error("Data Manager OAuth token refresh threw", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function buildGoogleDataManagerAuthHeaders(
  config: DataManagerAuthConfig,
  accessToken: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }
  if (config.quotaProjectId) headers["x-goog-user-project"] = config.quotaProjectId
  return headers
}

export function getGoogleDataManagerIngestUrl(): string {
  return DATA_MANAGER_INGEST_URL
}

export function getGoogleDataManagerRequestStatusUrl(requestId: string): string {
  const url = new URL(DATA_MANAGER_REQUEST_STATUS_URL)
  url.searchParams.set("requestId", requestId)
  return url.toString()
}

export function buildGoogleAdsDataManagerUserIdentifiers(
  userData?: GoogleAdsEnhancedUserData | null,
): DataManagerUserIdentifier[] {
  const identifiers: DataManagerUserIdentifier[] = []
  const emailAddress = hashEmailForGoogleAds(userData?.email)
  if (emailAddress) identifiers.push({ emailAddress })

  const phoneNumber = hashPhoneForGoogleAds(userData?.phone)
  if (phoneNumber) identifiers.push({ phoneNumber })

  return identifiers
}

export function buildGoogleAdsDataManagerIngestRequest(
  input: FireDataManagerConversionInput,
  config: {
    conversionActionId: string
    customerId: string
    loginCustomerId?: string | null
    validateOnly?: boolean
  },
): GoogleAdsDataManagerIngestRequest | null {
  const customerId = normalizeGoogleNumericId(config.customerId)
  const conversionActionId = normalizeGoogleNumericId(config.conversionActionId)
  const loginCustomerId = normalizeGoogleNumericId(config.loginCustomerId)
  if (!customerId || !conversionActionId) return null

  const clickIdentifier = selectGoogleAdsClickIdentifier(input)
  const userIdentifiers = buildGoogleAdsDataManagerUserIdentifiers(input.userData)
  if (!clickIdentifier && userIdentifiers.length === 0) return null

  const destination: DataManagerDestination = {
    operatingAccount: {
      accountId: customerId,
      accountType: "GOOGLE_ADS",
    },
    ...(loginCustomerId
      ? {
          loginAccount: {
            accountId: loginCustomerId,
            accountType: "GOOGLE_ADS" as const,
          },
        }
      : {}),
    productDestinationId: conversionActionId,
  }

  const event: DataManagerEvent = {
    ...(clickIdentifier ? { adIdentifiers: clickIdentifier } : {}),
    ...(userIdentifiers.length > 0 ? { consent: { adUserData: "CONSENT_GRANTED" } } : {}),
    conversionValue: input.value,
    currency: "AUD",
    eventSource: "WEB",
    eventTimestamp: (input.conversionDateTime ?? new Date()).toISOString(),
    transactionId: input.orderId,
    ...(userIdentifiers.length > 0 ? { userData: { userIdentifiers } } : {}),
  }

  return {
    destinations: [destination],
    encoding: "HEX",
    events: [event],
    ...(config.validateOnly ? { validateOnly: true } : {}),
  }
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = firstString(entry)
      if (candidate) return candidate
    }
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const candidate = firstString(entry)
      if (candidate) return candidate
    }
  }
  return null
}

export function extractGoogleDataManagerErrorCode(responseBody: string, status: number): string {
  try {
    const parsed = JSON.parse(responseBody) as {
      error?: {
        details?: unknown[]
        message?: string
        status?: string
      }
    }

    const error = parsed.error
    if (error) {
      const detailReason = firstString(error.details)
      const parts = [error.status, detailReason, error.message].filter(Boolean)
      if (parts.length > 0) return compactError(parts.join(":"), `http_${status}`)
    }
  } catch {
    // Fall back below.
  }

  return `http_${status}`
}

function parseRequestId(responseBody: string): string | null {
  try {
    const parsed = JSON.parse(responseBody) as { requestId?: string }
    return clean(parsed.requestId) || null
  } catch {
    return null
  }
}

export async function fireGoogleAdsDataManagerPurchaseConversion(
  input: FireDataManagerConversionInput,
): Promise<GoogleAdsConversionUploadResult> {
  const config = getGoogleDataManagerConfig()
  if (!config) {
    logger.warn("Google Data Manager conversion upload skipped - missing env vars", {
      hasClientId: Boolean(clean(process.env.GOOGLE_DATA_MANAGER_CLIENT_ID)),
      hasClientSecret: Boolean(clean(process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET)),
      hasConversionActionId: Boolean(clean(process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE)),
      hasCustomerId: Boolean(clean(process.env.GOOGLE_ADS_CUSTOMER_ID)),
      hasRefreshToken: Boolean(clean(process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN)),
    })
    return { attempted: false, error: "missing_env", uploadApi: "data_manager_api" }
  }

  const body = buildGoogleAdsDataManagerIngestRequest(input, config)
  if (!body) return { attempted: false, error: "missing_click_id", uploadApi: "data_manager_api" }

  const accessToken = await fetchGoogleDataManagerAccessToken(config)
  if (!accessToken) {
    logger.warn("Google Data Manager conversion upload skipped - failed to get access token")
    return { attempted: false, error: "no_access_token", uploadApi: "data_manager_api" }
  }

  try {
    const response = await fetch(getGoogleDataManagerIngestUrl(), {
      method: "POST",
      headers: buildGoogleDataManagerAuthHeaders(config, accessToken),
      body: JSON.stringify(body),
    })
    const responseBody = await response.text()

    if (!response.ok) {
      const error = extractGoogleDataManagerErrorCode(responseBody, response.status)
      logger.error("Google Data Manager conversion upload failed", { status: response.status })
      Sentry.captureMessage("Google Data Manager conversion upload non-200", {
        level: "warning",
        extra: {
          error,
          orderId: input.orderId,
          status: response.status,
        },
      })
      return { attempted: true, ok: false, error, uploadApi: "data_manager_api" }
    }

    const requestId = parseRequestId(responseBody)
    if (!requestId) {
      logger.error("Google Data Manager conversion upload missing requestId", { orderId: input.orderId })
      return { attempted: true, ok: false, error: "missing_request_id", uploadApi: "data_manager_api" }
    }

    logger.info("Google Data Manager conversion upload success", {
      orderId: input.orderId,
      requestId,
    })
    return {
      attempted: true,
      ok: true,
      requestId,
      uploadApi: "data_manager_api",
      uploadIdentifier: requestId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error("Google Data Manager conversion upload threw", {
      error: message,
      orderId: input.orderId,
    })
    Sentry.captureException(error, { tags: { route: "google-ads-data-manager-api" } })
    return { attempted: true, ok: false, error: message, uploadApi: "data_manager_api" }
  }
}

function getFirstRequestStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const records = (payload as { requestStatusPerDestination?: unknown }).requestStatusPerDestination
  if (!Array.isArray(records)) return null
  const first = records[0]
  if (!first || typeof first !== "object") return null
  const status = (first as { requestStatus?: unknown }).requestStatus
  return typeof status === "string" ? status : null
}

export async function retrieveGoogleDataManagerRequestStatus(
  requestId: string,
): Promise<GoogleDataManagerRequestStatusResult> {
  const normalizedRequestId = clean(requestId)
  if (!normalizedRequestId) return { attempted: false, error: "missing_request_id" }

  const config = getGoogleDataManagerAuthConfig()
  if (!config) return { attempted: false, error: "missing_env" }

  const accessToken = await fetchGoogleDataManagerAccessToken(config)
  if (!accessToken) return { attempted: false, error: "no_access_token" }

  try {
    const response = await fetch(getGoogleDataManagerRequestStatusUrl(normalizedRequestId), {
      method: "GET",
      headers: buildGoogleDataManagerAuthHeaders(config, accessToken),
    })
    const responseBody = await response.text()
    if (!response.ok) {
      return {
        attempted: true,
        ok: false,
        error: extractGoogleDataManagerErrorCode(responseBody, response.status),
      }
    }

    const payload = responseBody ? JSON.parse(responseBody) as { requestStatusPerDestination?: unknown[] } : {}
    return {
      attempted: true,
      ok: true,
      requestStatusPerDestination: Array.isArray(payload.requestStatusPerDestination)
        ? payload.requestStatusPerDestination
        : [],
      status: getFirstRequestStatus(payload),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { attempted: true, ok: false, error: message }
  }
}
