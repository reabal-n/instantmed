import "server-only"

import { createHash } from "node:crypto"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("google-ads-conversion-api")
const DEFAULT_GOOGLE_ADS_API_VERSION = "v24"

/**
 * Server-side Google Ads Conversion API client.
 *
 * Why: browser-side gtag misses ~30% of attribution on iOS Safari (ITP blocks
 * third-party cookies) and other privacy-restricted contexts. Firing the same
 * conversion server-side using the captured click id and/or hashed first-party
 * identifiers recovers that loss. `order_id` keeps upload retries idempotent
 * for this conversion action; Ads account goal settings still decide whether
 * browser and offline actions are counted together.
 *
 * Required env vars (all must be present for the call to fire):
 *   GOOGLE_ADS_CUSTOMER_ID            - 10-digit customer id, no dashes
 *   GOOGLE_ADS_DEVELOPER_TOKEN        - the developer token from API Center
 *   GOOGLE_ADS_CLIENT_ID        - OAuth 2.0 client id from GCP console
 *   GOOGLE_ADS_CLIENT_SECRET    - OAuth 2.0 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN    - long-lived refresh token (one-time
 *                                       OAuth grant; persist securely)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID      - optional MCC id when the customer is
 *                                       under a manager account
 *   GOOGLE_ADS_QUOTA_PROJECT_ID       - optional Google Cloud quota project
 *                                       required by some user OAuth setups
 *   GOOGLE_ADS_API_VERSION            - optional API version override
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
  /**
   * Raw (un-hashed) first-party customer data for enhanced conversions. The
   * lib normalizes + SHA-256 hashes it before it ever leaves the server, so
   * callers MUST pass plaintext (never a hash). Email and phone.
   */
  userData?: GoogleAdsEnhancedUserData | null
}

/** Raw, plaintext first-party identifiers. Hashed inside this module. */
export interface GoogleAdsEnhancedUserData {
  email?: string | null
  phone?: string | null
}

type ClickIdentifier = {
  gbraid?: string
  gclid?: string
  wbraid?: string
}

export type GoogleAdsConversionAdjustmentType = "RETRACTION" | "RESTATEMENT"

type GoogleAdsConsentStatus = "GRANTED" | "DENIED" | "UNSPECIFIED"

type GoogleAdsClickConversionConsent = {
  adUserData: GoogleAdsConsentStatus
}

/**
 * A single hashed first-party identifier. UserIdentifier is a protobuf oneof,
 * so each object carries exactly ONE identifier — email and phone go in
 * separate objects.
 */
type GoogleAdsUserIdentifier =
  | { hashedEmail: string; userIdentifierSource: "FIRST_PARTY" }
  | { hashedPhoneNumber: string; userIdentifierSource: "FIRST_PARTY" }

interface GoogleAdsClickConversionRequest {
  conversions: Array<{
    conversionAction: string
    conversionDateTime: string
    conversionEnvironment: "WEB"
    conversionValue: number
    currencyCode: "AUD"
    orderId: string
    consent?: GoogleAdsClickConversionConsent
    userIdentifiers?: GoogleAdsUserIdentifier[]
  } & ClickIdentifier>
  jobId?: number
  partialFailure: true
}

interface FireConversionAdjustmentInput {
  /** Stable per-purchase order id from the original Google Ads import. */
  orderId: string
  /** RETRACTION for full value removal; RESTATEMENT for partial retained value. */
  adjustmentType: GoogleAdsConversionAdjustmentType
  /** Required for RESTATEMENT, omitted for RETRACTION. Dollars in AUD. */
  adjustedValue?: number | null
  /** When the refund/dispute adjustment happened. Defaults to now. */
  adjustmentDateTime?: Date
}

interface GoogleAdsConversionAdjustmentRequest {
  conversionAdjustments: Array<{
    adjustmentDateTime: string
    adjustmentType: GoogleAdsConversionAdjustmentType
    conversionAction: string
    orderId: string
    restatementValue?: {
      adjustedValue: number
    }
  }>
  partialFailure: true
}

export type GoogleAdsConversionUploadResult = {
  attempted: boolean
  ok?: boolean
  error?: string
  jobId?: number | string
  requestId?: string
  uploadApi?: "data_manager_api" | "google_ads_api"
  uploadIdentifier?: string
}

export type GoogleAdsConversionActionPreflightIssueCode =
  | "conversion_action_not_enabled"
  | "conversion_action_not_found"
  | "conversion_action_preflight_failed"
  | "invalid_conversion_action_type"
  | "missing_env"
  | "no_access_token"
  | null

export type GoogleAdsConversionActionPreflightSeverity = "ok" | "warning" | "error"

export interface GoogleAdsConversionActionSnapshot {
  id: string
  name: string | null
  resourceName: string | null
  status: string | null
  type: string | null
}

export interface GoogleAdsConversionActionPreflightResult {
  action: string
  code: GoogleAdsConversionActionPreflightIssueCode
  conversionAction: GoogleAdsConversionActionSnapshot | null
  detail: string
  label: string
  ok: boolean
  severity: GoogleAdsConversionActionPreflightSeverity
}

interface AccessTokenCache {
  token: string
  expiresAt: number
}

export type GoogleAdsSearchRow = Record<string, unknown>

let tokenCache: AccessTokenCache | null = null

const REQUIRED_UPLOAD_CLICK_CONVERSION_ACTION_TYPE = "UPLOAD_CLICKS"

export function resetGoogleAdsAccessTokenCacheForTests(): void {
  tokenCache = null
}

function normalizeGoogleAdsNumericId(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const resourceId = trimmed.match(/\/(\d+)$/)?.[1]
  const normalized = (resourceId || trimmed).replace(/-/g, "")
  return /^\d+$/.test(normalized) ? normalized : null
}

function getConfiguredPurchaseConversionActionId(): string | null {
  return normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE)
}

function getGoogleAdsPurchaseConversionConfig(): {
  apiVersion: string
  conversionActionId: string
  customerId: string
  developerToken: string
  loginCustomerId?: string
  quotaProjectId?: string
} | null {
  const customerId = normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_CUSTOMER_ID)
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const conversionActionId = getConfiguredPurchaseConversionActionId()

  if (!customerId || !developerToken || !conversionActionId) return null

  return {
    apiVersion: process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
    conversionActionId,
    customerId,
    developerToken,
    loginCustomerId: normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) || undefined,
    quotaProjectId: process.env.GOOGLE_ADS_QUOTA_PROJECT_ID?.trim() || undefined,
  }
}

function buildGoogleAdsAuthHeaders(
  config: NonNullable<ReturnType<typeof getGoogleAdsPurchaseConversionConfig>>,
  accessToken: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
  }
  if (config.loginCustomerId) headers["login-customer-id"] = config.loginCustomerId
  if (config.quotaProjectId) headers["x-goog-user-project"] = config.quotaProjectId
  return headers
}

async function fetchAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

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

function normalizeClickId(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
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

export function extractGoogleAdsErrorCode(responseBody: string, status: number): string {
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
      const [namespace, code] = Object.entries(googleAdsError.errorCode)[0] || []
      const detail = [namespace, code, googleAdsError.message]
        .filter(Boolean)
        .join(":")
      return compactError(detail, `http_${status}`)
    }

    if (errorSource?.message) {
      return compactError(errorSource.message, `http_${status}`)
    }
  } catch {
    // Fall back below.
  }

  return `http_${status}`
}

export function selectGoogleAdsClickIdentifier(input: {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
}): ClickIdentifier | null {
  const gclid = normalizeClickId(input.gclid)
  const gbraid = normalizeClickId(input.gbraid)
  const wbraid = normalizeClickId(input.wbraid)

  if (gclid) return { gclid }
  if (gbraid) return { gbraid }
  if (wbraid) return { wbraid }
  return null
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

/**
 * Normalize an email to Google's enhanced-conversions spec so our hash matches
 * the hash Google computes on its side (otherwise the upload matches nothing):
 * lowercase, strip all whitespace, and for gmail/googlemail remove dots and
 * plus suffixes in the local part. Returns null for anything implausible.
 * Ref: https://developers.google.com/google-ads/api/docs/conversions/upload-online#normalize_and_hash_user-provided_data
 */
export function normalizeEmailForGoogleAds(raw?: string | null): string | null {
  const lowered = raw?.trim().toLowerCase()
  if (!lowered) return null
  const at = lowered.lastIndexOf("@")
  if (at <= 0 || at === lowered.length - 1) return null
  let local = lowered.slice(0, at)
  const domain = lowered.slice(at + 1)
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = (local.split("+", 1)[0] || "").replace(/\./g, "")
  }
  const normalized = `${local}@${domain}`.replace(/\s+/g, "")
  // Reject if normalization collapsed the local part to nothing.
  return /^[^@\s]+@[^@\s]+$/.test(normalized) ? normalized : null
}

/** SHA-256 hex of a Google-normalized email, or null if the email is unusable. */
export function hashEmailForGoogleAds(raw?: string | null): string | null {
  const normalized = normalizeEmailForGoogleAds(raw)
  return normalized ? sha256Hex(normalized) : null
}

/**
 * Normalize a phone to E.164 (with leading `+`) so the hash matches Google's
 * side, defaulting bare national numbers to Australia (+61). Returns null for
 * anything that can't be coerced into a plausible E.164 number.
 * Ref: https://support.google.com/google-ads/answer/9888656
 */
export function normalizePhoneForGoogleAds(raw?: string | null): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const hadPlus = trimmed.startsWith("+")
  let digits = trimmed.replace(/\D/g, "")
  if (!digits) return null
  if (!hadPlus) {
    if (digits.startsWith("0")) {
      // AU national format (04xx…, 02…) → +61, dropping the trunk 0.
      digits = `61${digits.slice(1)}`
    } else if (!digits.startsWith("61")) {
      // Bare national number without trunk 0 (e.g. 4xxxxxxxx) → assume AU.
      digits = `61${digits}`
    }
  }
  // E.164 allows up to 15 digits; require a sane minimum so junk is dropped.
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

/** SHA-256 hex of a Google-normalized E.164 phone, or null if unusable. */
export function hashPhoneForGoogleAds(raw?: string | null): string | null {
  const normalized = normalizePhoneForGoogleAds(raw)
  return normalized ? sha256Hex(normalized) : null
}

/**
 * Build the `userIdentifiers` array (enhanced conversions) from raw first-party
 * data — one object per identifier (oneof). Empty array when nothing usable is
 * present; callers should omit the field entirely rather than send `[]`.
 */
export function buildGoogleAdsUserIdentifiers(
  userData?: GoogleAdsEnhancedUserData | null,
): GoogleAdsUserIdentifier[] {
  const identifiers: GoogleAdsUserIdentifier[] = []
  const hashedEmail = hashEmailForGoogleAds(userData?.email)
  if (hashedEmail) {
    identifiers.push({ hashedEmail, userIdentifierSource: "FIRST_PARTY" })
  }
  const hashedPhoneNumber = hashPhoneForGoogleAds(userData?.phone)
  if (hashedPhoneNumber) {
    identifiers.push({ hashedPhoneNumber, userIdentifierSource: "FIRST_PARTY" })
  }
  return identifiers
}

export function getGoogleAdsUploadClickConversionsUrl(
  customerId: string,
  apiVersion = process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}:uploadClickConversions`
}

export function getGoogleAdsUploadConversionAdjustmentsUrl(
  customerId: string,
  apiVersion = process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}:uploadConversionAdjustments`
}

export function getGoogleAdsSearchUrl(
  customerId: string,
  apiVersion = process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION,
): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`
}

export function buildGoogleAdsConversionActionPreflightQuery(conversionActionId: string): string {
  const normalizedConversionActionId = normalizeGoogleAdsNumericId(conversionActionId)
  if (!normalizedConversionActionId) {
    throw new Error("Google Ads conversion action id must be numeric")
  }

  return [
    "SELECT",
    "conversion_action.id,",
    "conversion_action.name,",
    "conversion_action.resource_name,",
    "conversion_action.status,",
    "conversion_action.type",
    "FROM conversion_action",
    `WHERE conversion_action.id = ${normalizedConversionActionId}`,
    "LIMIT 1",
  ].join(" ")
}

export function buildGoogleAdsClickConversionRequest(
  input: FireConversionInput,
  config: { customerId: string; conversionActionId: string },
): GoogleAdsClickConversionRequest | null {
  const clickIdentifier = selectGoogleAdsClickIdentifier(input)
  const conversionActionId = normalizeGoogleAdsNumericId(config.conversionActionId)
  if (!conversionActionId) return null

  const userIdentifiers = buildGoogleAdsUserIdentifiers(input.userData)
  if (!clickIdentifier && userIdentifiers.length === 0) return null

  return {
    conversions: [
      {
        conversionAction: `customers/${config.customerId}/conversionActions/${conversionActionId}`,
        ...(clickIdentifier ?? {}),
        conversionDateTime: formatGoogleAdsDateTime(input.conversionDateTime ?? new Date()),
        conversionEnvironment: "WEB",
        conversionValue: input.value,
        currencyCode: "AUD",
        orderId: input.orderId,
        ...(userIdentifiers.length > 0 ? { consent: { adUserData: "GRANTED" } } : {}),
        ...(userIdentifiers.length > 0 ? { userIdentifiers } : {}),
      },
    ],
    // Do not pin jobId. Google assigns a unique diagnostics job id per request
    // when omitted, which gives operations a fresh watch target after each upload.
    partialFailure: true,
  }
}

export function buildGoogleAdsConversionAdjustmentRequest(
  input: FireConversionAdjustmentInput,
  config: { customerId: string; conversionActionId: string },
): GoogleAdsConversionAdjustmentRequest | null {
  const conversionActionId = normalizeGoogleAdsNumericId(config.conversionActionId)
  const orderId = input.orderId.trim()
  if (!conversionActionId || !orderId) return null

  if (input.adjustmentType === "RESTATEMENT") {
    if (typeof input.adjustedValue !== "number") return null
    if (!Number.isFinite(input.adjustedValue) || input.adjustedValue < 0) return null
  }

  const conversionAdjustment: GoogleAdsConversionAdjustmentRequest["conversionAdjustments"][number] = {
    adjustmentDateTime: formatGoogleAdsDateTime(input.adjustmentDateTime ?? new Date()),
    adjustmentType: input.adjustmentType,
    conversionAction: `customers/${config.customerId}/conversionActions/${conversionActionId}`,
    orderId,
  }

  if (input.adjustmentType === "RESTATEMENT") {
    conversionAdjustment.restatementValue = {
      adjustedValue: input.adjustedValue!,
    }
  }

  return {
    conversionAdjustments: [conversionAdjustment],
    partialFailure: true,
  }
}

function stringifyGoogleAdsErrorPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return ""
  }
}

function getUnknownPreflightError(error: unknown): GoogleAdsConversionActionPreflightResult {
  const message = error instanceof Error ? error.message : String(error)
  return {
    action: "Check the Google Ads API credentials and retry the health check before forcing a backfill.",
    code: "conversion_action_preflight_failed",
    conversionAction: null,
    detail: compactError(message, "preflight_failed"),
    label: "Preflight failed",
    ok: false,
    severity: "warning",
  }
}

function getMissingEnvPreflight(): GoogleAdsConversionActionPreflightResult {
  return {
    action: "Set the Google Ads customer id, developer token, and offline purchase conversion action id in production.",
    code: "missing_env",
    conversionAction: null,
    detail: "The purchase conversion action cannot be checked because required Google Ads env vars are missing.",
    label: "Missing Google Ads env",
    ok: false,
    severity: "error",
  }
}

function getMissingAccessTokenPreflight(): GoogleAdsConversionActionPreflightResult {
  return {
    action: "Regenerate the Google Ads OAuth refresh token and confirm the account can mint access tokens.",
    code: "no_access_token",
    conversionAction: null,
    detail: "The purchase conversion action cannot be checked because OAuth access-token minting failed.",
    label: "OAuth token unavailable",
    ok: false,
    severity: "error",
  }
}

export function classifyGoogleAdsConversionActionPreflight(
  conversionAction: GoogleAdsConversionActionSnapshot | null,
): GoogleAdsConversionActionPreflightResult {
  if (!conversionAction) {
    return {
      action: "Use the conversion customer that owns the offline purchase action, or update GOOGLE_ADS_CONVERSION_ACTION_PURCHASE.",
      code: "conversion_action_not_found",
      conversionAction: null,
      detail: "The configured purchase conversion action was not found in the Google Ads conversion customer.",
      label: "Conversion action not found",
      ok: false,
      severity: "error",
    }
  }

  const name = conversionAction.name ? `"${conversionAction.name}"` : "The configured conversion action"

  if (conversionAction.type !== REQUIRED_UPLOAD_CLICK_CONVERSION_ACTION_TYPE) {
    return {
      action: "Create or select a Google Ads offline click-import purchase action with type UPLOAD_CLICKS, then update GOOGLE_ADS_CONVERSION_ACTION_PURCHASE.",
      code: "invalid_conversion_action_type",
      conversionAction,
      detail: `${name} is type ${conversionAction.type || "unknown"}, but uploadClickConversions requires UPLOAD_CLICKS.`,
      label: "Wrong conversion action type",
      ok: false,
      severity: "error",
    }
  }

  if (conversionAction.status !== "ENABLED") {
    return {
      action: "Enable the offline purchase conversion action in Google Ads before relying on server-side uploads.",
      code: "conversion_action_not_enabled",
      conversionAction,
      detail: `${name} is ${conversionAction.status || "not enabled"}. Google Ads imports should target an enabled action.`,
      label: "Conversion action not enabled",
      ok: false,
      severity: "error",
    }
  }

  return {
    action: "No action needed.",
    code: null,
    conversionAction,
    detail: `${name} is enabled and accepts uploadClickConversions imports.`,
    label: "Conversion action accepts uploads",
    ok: true,
    severity: "ok",
  }
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function parseConversionActionSearchResult(payload: unknown): GoogleAdsConversionActionSnapshot | null {
  if (!payload || typeof payload !== "object" || !("results" in payload)) return null
  const results = (payload as { results?: unknown }).results
  if (!Array.isArray(results)) return null
  const row = results[0]
  if (!row || typeof row !== "object" || !("conversionAction" in row)) return null
  const conversionAction = (row as { conversionAction?: unknown }).conversionAction
  if (!conversionAction || typeof conversionAction !== "object") return null
  const fields = conversionAction as Record<string, unknown>

  return {
    id: asString(fields.id) || "",
    name: asString(fields.name),
    resourceName: asString(fields.resourceName),
    status: asString(fields.status),
    type: asString(fields.type),
  }
}

export async function preflightGoogleAdsPurchaseConversionAction(): Promise<GoogleAdsConversionActionPreflightResult> {
  const config = getGoogleAdsPurchaseConversionConfig()
  if (!config) return getMissingEnvPreflight()

  const accessToken = await fetchAccessToken()
  if (!accessToken) return getMissingAccessTokenPreflight()

  try {
    const res = await fetch(getGoogleAdsSearchUrl(config.customerId, config.apiVersion), {
      method: "POST",
      headers: buildGoogleAdsAuthHeaders(config, accessToken),
      body: JSON.stringify({
        query: buildGoogleAdsConversionActionPreflightQuery(config.conversionActionId),
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      return {
        action: "Check the Google Ads API credentials, conversion customer id, and conversion-action access.",
        code: "conversion_action_preflight_failed",
        conversionAction: null,
        detail: extractGoogleAdsErrorCode(stringifyGoogleAdsErrorPayload(json), res.status),
        label: "Preflight failed",
        ok: false,
        severity: "warning",
      }
    }

    return classifyGoogleAdsConversionActionPreflight(parseConversionActionSearchResult(json))
  } catch (error) {
    return getUnknownPreflightError(error)
  }
}

export async function searchGoogleAds<T extends GoogleAdsSearchRow = GoogleAdsSearchRow>(
  query: string,
): Promise<T[]> {
  const config = getGoogleAdsPurchaseConversionConfig()
  if (!config) throw new Error("missing_env")

  const accessToken = await fetchAccessToken()
  if (!accessToken) throw new Error("no_access_token")

  const response = await fetch(getGoogleAdsSearchUrl(config.customerId, config.apiVersion), {
    method: "POST",
    headers: buildGoogleAdsAuthHeaders(config, accessToken),
    body: JSON.stringify({ query }),
  })

  const responseBody = await response.text()
  const payload = responseBody ? JSON.parse(responseBody) as { results?: T[] } : {}

  if (!response.ok) {
    throw new Error(extractGoogleAdsErrorCode(responseBody, response.status))
  }

  return Array.isArray(payload.results) ? payload.results : []
}

function extractGoogleAdsUploadJobId(payload: unknown, fallback?: number): number | string | undefined {
  if (payload && typeof payload === "object") {
    const fields = payload as Record<string, unknown>
    const jobId = fields.jobId ?? fields.job_id
    if (typeof jobId === "number" || typeof jobId === "string") return jobId
  }
  return fallback
}

/**
 * Fire a server-side Google Ads conversion for a completed purchase.
 *
 * No-ops cleanly if env vars are not yet configured. Returns true if the
 * call was attempted (independent of API success), false if skipped.
 */
export async function fireGoogleAdsPurchaseConversion(
  input: FireConversionInput,
): Promise<GoogleAdsConversionUploadResult> {
  const config = getGoogleAdsPurchaseConversionConfig()

  if (!config) {
    logger.warn("Google Ads Conversion API skipped - missing env vars", {
      hasCustomerId: !!process.env.GOOGLE_ADS_CUSTOMER_ID,
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      hasConversionActionId: !!process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE,
    })
    return { attempted: false, error: "missing_env" }
  }

  const body = buildGoogleAdsClickConversionRequest(input, config)
  if (!body) {
    // No click identifier and no usable enhanced-conversion identifiers.
    return { attempted: false, error: "missing_click_id" }
  }

  const accessToken = await fetchAccessToken()
  if (!accessToken) {
    logger.warn("Google Ads Conversion API skipped - failed to get access token")
    return { attempted: false, error: "no_access_token" }
  }

  try {
    const url = getGoogleAdsUploadClickConversionsUrl(config.customerId, config.apiVersion)

    const res = await fetch(url, {
      method: "POST",
      headers: buildGoogleAdsAuthHeaders(config, accessToken),
      body: JSON.stringify(body),
    })

    const responseBody = await res.text()

    if (!res.ok) {
      logger.error("Google Ads Conversion API call failed", {
        status: res.status,
      })
      Sentry.captureMessage("Google Ads Conversion API non-200", {
        level: "warning",
        extra: {
          orderId: input.orderId,
          error: extractGoogleAdsErrorCode(responseBody, res.status),
          status: res.status,
        },
      })
      return {
        attempted: true,
        ok: false,
        error: extractGoogleAdsErrorCode(responseBody, res.status),
        jobId: body.jobId,
      }
    }

    // Partial failures come back in the response body even with 200. Parse and
    // log so we surface them.
    let parsed: unknown
    try {
      parsed = JSON.parse(responseBody)
    } catch {
      parsed = null
    }
    const jobId = extractGoogleAdsUploadJobId(parsed, body.jobId)
    const partialFailure =
      typeof parsed === "object" && parsed !== null && "partialFailureError" in parsed
        ? (parsed as { partialFailureError?: { message?: string } }).partialFailureError
        : undefined
    if (partialFailure?.message) {
      const errorCode = extractGoogleAdsErrorCode(responseBody, 200)
      logger.warn("Google Ads Conversion API partial failure", {
        jobId,
        orderId: input.orderId,
        message: partialFailure.message,
      })
      Sentry.captureMessage("Google Ads Conversion API partial failure", {
        level: "warning",
        extra: {
          orderId: input.orderId,
          error: errorCode,
          jobId,
          message: partialFailure.message,
        },
      })
      return { attempted: true, ok: false, error: errorCode, jobId }
    } else {
      logger.info("Google Ads Conversion API success", { orderId: input.orderId, jobId })
    }

    return { attempted: true, ok: true, jobId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Google Ads Conversion API threw", { orderId: input.orderId, error: message })
    Sentry.captureException(err, { tags: { route: "google-ads-conversion-api" } })
    return { attempted: true, ok: false, error: message }
  }
}

export async function fireGoogleAdsConversionAdjustment(
  input: FireConversionAdjustmentInput,
): Promise<GoogleAdsConversionUploadResult> {
  const config = getGoogleAdsPurchaseConversionConfig()

  if (!config) {
    logger.warn("Google Ads conversion adjustment skipped - missing env vars", {
      hasCustomerId: !!process.env.GOOGLE_ADS_CUSTOMER_ID,
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      hasConversionActionId: !!process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE,
    })
    return { attempted: false, error: "missing_env" }
  }

  const body = buildGoogleAdsConversionAdjustmentRequest(input, config)
  if (!body) {
    return { attempted: false, error: "invalid_adjustment" }
  }

  const accessToken = await fetchAccessToken()
  if (!accessToken) {
    logger.warn("Google Ads conversion adjustment skipped - failed to get access token")
    return { attempted: false, error: "no_access_token" }
  }

  try {
    const url = getGoogleAdsUploadConversionAdjustmentsUrl(config.customerId, config.apiVersion)
    const res = await fetch(url, {
      method: "POST",
      headers: buildGoogleAdsAuthHeaders(config, accessToken),
      body: JSON.stringify(body),
    })

    const responseBody = await res.text()
    if (!res.ok) {
      const errorCode = extractGoogleAdsErrorCode(responseBody, res.status)
      logger.error("Google Ads conversion adjustment failed", {
        adjustmentType: input.adjustmentType,
        orderId: input.orderId,
        status: res.status,
      })
      Sentry.captureMessage("Google Ads conversion adjustment non-200", {
        level: "warning",
        extra: {
          adjustmentType: input.adjustmentType,
          error: errorCode,
          orderId: input.orderId,
          status: res.status,
        },
      })
      return { attempted: true, ok: false, error: errorCode }
    }

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
      const errorCode = extractGoogleAdsErrorCode(responseBody, 200)
      logger.warn("Google Ads conversion adjustment partial failure", {
        adjustmentType: input.adjustmentType,
        orderId: input.orderId,
        message: partialFailure.message,
      })
      Sentry.captureMessage("Google Ads conversion adjustment partial failure", {
        level: "warning",
        extra: {
          adjustmentType: input.adjustmentType,
          error: errorCode,
          orderId: input.orderId,
          message: partialFailure.message,
        },
      })
      return { attempted: true, ok: false, error: errorCode }
    }

    logger.info("Google Ads conversion adjustment success", {
      adjustmentType: input.adjustmentType,
      orderId: input.orderId,
    })
    return { attempted: true, ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Google Ads conversion adjustment threw", {
      adjustmentType: input.adjustmentType,
      orderId: input.orderId,
      error: message,
    })
    Sentry.captureException(err, { tags: { route: "google-ads-conversion-adjustment-api" } })
    return { attempted: true, ok: false, error: message }
  }
}
