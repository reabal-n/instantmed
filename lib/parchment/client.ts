/**
 * Parchment Health API Client
 *
 * Server-only module for communicating with the Parchment ePrescribing API.
 * Handles JWT token caching, patient CRUD, SSO URL generation, and user listing.
 *
 * Docs: https://docs.parchmenthealth.io
 */

import "server-only"

import * as Sentry from "@sentry/nextjs"
import crypto from "crypto"

import { createLogger } from "@/lib/observability/logger"

import {
  type CreatePatientRequest,
  type CreatePatientResponse,
  createPatientResponseSchema,
  type ListUsersResponse,
  listUsersResponseSchema,
  PARCHMENT_SCOPES,
  type ParchmentSsoResponse,
  parchmentSsoResponseSchema,
  parchmentTokenResponseSchema,
  type ParchmentUser,
  type PatientPrescriptionsResponse,
  patientPrescriptionsResponseSchema,
  type UpdatePatientRequest,
  type UpdatePatientResponse,
  updatePatientResponseSchema,
  type ValidateIntegrationResponse,
  validateIntegrationResponseSchema,
} from "./types"

const log = createLogger("parchment")

// ============================================================================
// CONFIGURATION
// ============================================================================

function getConfig() {
  const apiUrl = process.env.PARCHMENT_API_URL
  const partnerId = process.env.PARCHMENT_PARTNER_ID
  const partnerSecret = process.env.PARCHMENT_PARTNER_SECRET
  const organizationId = process.env.PARCHMENT_ORGANIZATION_ID
  const organizationSecret = process.env.PARCHMENT_ORGANIZATION_SECRET

  if (!apiUrl || !partnerId || !partnerSecret || !organizationId || !organizationSecret) {
    throw new Error(
      "Missing Parchment configuration. Required: PARCHMENT_API_URL, PARCHMENT_PARTNER_ID, " +
      "PARCHMENT_PARTNER_SECRET, PARCHMENT_ORGANIZATION_ID, PARCHMENT_ORGANIZATION_SECRET"
    )
  }

  return { apiUrl, partnerId, partnerSecret, organizationId, organizationSecret }
}

// ============================================================================
// TOKEN CACHE
// ============================================================================

/** Per-user token cache - avoids serving doctor A's token to doctor B in shared serverless instances */
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>()

/**
 * Get a valid JWT token, using cache when possible.
 * Tokens are cached with a 60s buffer before expiry.
 *
 * @param userId - Parchment user ID for the prescriber (required by API)
 * @param scopes - Permission scopes to request
 */
async function getToken(userId: string, scopes: string[]): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid (60s buffer)
  const cached = tokenCache.get(userId)
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.accessToken
  }

  const config = getConfig()

  const res = await fetch(`${config.apiUrl}/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": config.partnerId,
      "x-partner-secret": config.partnerSecret,
      "x-organization-id": config.organizationId,
      "x-organization-secret": config.organizationSecret,
      "x-user-id": userId,
    },
    body: JSON.stringify({
      grantType: "client_credentials",
      scope: scopes,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment token request failed: ${res.status}`)
    log.error("Token request failed", { status: res.status, responseBytes: body.length }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = parchmentTokenResponseSchema.parse(json)

  tokenCache.set(userId, {
    accessToken: parsed.data.accessToken,
    expiresAt: now + parsed.data.expiresIn * 1000,
  })

  log.info("Token acquired", { userId, scopes, expiresIn: parsed.data.expiresIn })
  return parsed.data.accessToken
}

/** Force-clear cached token(s) - called after 401 errors to force re-auth */
export function clearTokenCache(userId?: string): void {
  if (userId) {
    tokenCache.delete(userId)
  } else {
    tokenCache.clear()
  }
}

// ============================================================================
// INTEGRATION VALIDATION
// ============================================================================

/**
 * Validate the current organization integration with a token generated for the
 * logged-in Parchment user. Parchment uses this call during conformance to
 * confirm the /token + /validate setup is wired correctly.
 */
export async function validateIntegration(
  userId: string,
): Promise<ValidateIntegrationResponse["data"] & { message?: string; requestId?: string }> {
  const config = getConfig()
  const token = await getToken(userId, [
    PARCHMENT_SCOPES.CREATE_PATIENT,
    PARCHMENT_SCOPES.READ_PATIENT,
  ])

  const res = await fetch(`${config.apiUrl}/v1/organizations/${config.organizationId}/validate`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment integration validation failed: ${res.status}`)
    log.error("Integration validation failed", { status: res.status }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = validateIntegrationResponseSchema.parse(json)

  log.info("Integration validated", {
    userId,
    validated: parsed.data.validated,
    requestId: parsed.requestId,
  })

  return {
    ...parsed.data,
    message: parsed.message,
    requestId: parsed.requestId,
  }
}

// ============================================================================
// PATIENTS
// ============================================================================

/**
 * Create a patient in Parchment.
 * Uses the prescriber's user_id in the URL path as required by the API.
 */
export async function createPatient(
  userId: string,
  patient: CreatePatientRequest,
): Promise<CreatePatientResponse["data"]> {
  const config = getConfig()
  const token = await getToken(userId, [
    PARCHMENT_SCOPES.CREATE_PATIENT,
    PARCHMENT_SCOPES.READ_PATIENT,
  ])

  const url = `${config.apiUrl}/v1/organizations/${config.organizationId}/users/${userId}/patients`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
    body: JSON.stringify({ ...patient, partner_id: config.partnerId }),
  })

  if (!res.ok) {
    if (res.status === 401) clearTokenCache(userId)
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment create patient failed: ${res.status}`)
    log.error("Create patient failed", { status: res.status, responseBytes: body.length }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = createPatientResponseSchema.parse(json)

  log.info("Patient created in Parchment")

  return parsed.data
}

/**
 * Update an existing patient in Parchment.
 * Uses the prescriber's user_id in the URL path as required by the API.
 */
export async function updatePatient(
  userId: string,
  patientId: string,
  patient: UpdatePatientRequest,
): Promise<UpdatePatientResponse["data"] & { requestId?: string }> {
  const config = getConfig()
  const token = await getToken(userId, [
    PARCHMENT_SCOPES.UPDATE_PATIENT,
    PARCHMENT_SCOPES.READ_PATIENT,
  ])

  const url = `${config.apiUrl}/v1/organizations/${config.organizationId}/users/${userId}/patients/${patientId}`

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
    body: JSON.stringify(patient),
  })

  if (!res.ok) {
    if (res.status === 401) clearTokenCache(userId)
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment update patient failed: ${res.status}`)
    log.error("Update patient failed", { status: res.status, responseBytes: body.length }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = updatePatientResponseSchema.parse(json)

  log.info("Patient updated in Parchment", {
    requestId: parsed.requestId,
  })

  return {
    ...parsed.data,
    requestId: parsed.requestId,
  }
}

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export async function getPatientPrescriptions({
  userId,
  patientId,
  limit = 20,
  lastKey,
}: {
  userId: string
  patientId: string
  limit?: number
  lastKey?: string | null
}): Promise<PatientPrescriptionsResponse["data"] & { pagination?: PatientPrescriptionsResponse["pagination"]; requestId?: string }> {
  const config = getConfig()
  const token = await getToken(userId, [PARCHMENT_SCOPES.READ_PATIENT_PRESCRIPTION])
  const params = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 50)) })
  if (lastKey) params.set("lastKey", lastKey)

  const url = `${config.apiUrl}/v1/organizations/${config.organizationId}/users/${userId}/patients/${patientId}/prescriptions?${params.toString()}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
  })

  if (!res.ok) {
    if (res.status === 401) clearTokenCache(userId)
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment get patient prescriptions failed: ${res.status}`)
    log.error("Get patient prescriptions failed", { status: res.status, responseBytes: body.length }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = patientPrescriptionsResponseSchema.parse(json)

  log.info("Patient prescriptions retrieved from Parchment", {
    count: parsed.data.prescriptions.length,
    requestId: parsed.requestId,
  })

  return {
    ...parsed.data,
    pagination: parsed.pagination,
    requestId: parsed.requestId,
  }
}

// ============================================================================
// SSO
// ============================================================================

/**
 * Generate an SSO redirect URL for embedding Parchment in an iframe.
 *
 * @param userId - Parchment user ID of the prescriber
 * @param redirectPath - Path within Parchment (use /embed/ prefix for iframe mode)
 */
export async function getSsoUrl(
  userId: string,
  redirectPath: string,
): Promise<ParchmentSsoResponse["data"]> {
  const config = getConfig()

  const res = await fetch(`${config.apiUrl}/v1/sso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": config.partnerId,
      "x-partner-secret": config.partnerSecret,
      "x-organization-id": config.organizationId,
      "x-organization-secret": config.organizationSecret,
      "x-user-id": userId,
    },
    body: JSON.stringify({ redirect_path: redirectPath }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment SSO request failed: ${res.status}`)
    log.error("SSO request failed", { status: res.status, responseBytes: body.length }, err)
    Sentry.captureException(err, { extra: { status: res.status, responseBytes: body.length } })
    throw err
  }

  const json = await res.json()
  const parsed = parchmentSsoResponseSchema.parse(json)

  log.info("SSO URL generated", { expiresIn: parsed.data.expires_in })
  return parsed.data
}

// ============================================================================
// USERS (for account linking)
// ============================================================================

/**
 * List all users in the Parchment organization.
 * Auto-paginates through all results using `lastKey` cursor.
 * Used for linking a doctor's InstantMed account to their Parchment user.
 */
export async function listUsers(callerUserId?: string): Promise<ListUsersResponse["data"]> {
  const config = getConfig()
  // For org-level operations, use provided userId or fall back to any known user
  const userId = callerUserId || process.env.PARCHMENT_DEFAULT_USER_ID || ""
  if (!userId) {
    throw new Error("No Parchment user ID available for token generation. Set PARCHMENT_DEFAULT_USER_ID or pass callerUserId.")
  }
  const token = await getToken(userId, [PARCHMENT_SCOPES.READ_USERS])

  const allUsers: ParchmentUser[] = []
  let lastKey: string | null = null
  const PAGE_LIMIT = 100
  const MAX_PAGES = 50 // Safety cap to prevent infinite loops

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) })
    if (lastKey) params.set("lastKey", lastKey)

    const url = `${config.apiUrl}/v1/organizations/${config.organizationId}/users?${params.toString()}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-organization-secret": config.organizationSecret,
      },
    })

    if (!res.ok) {
      if (res.status === 401) clearTokenCache(userId)
      const body = await res.text().catch(() => "")
      const err = new Error(`Parchment list users failed: ${res.status}`)
      log.error("List users failed", { status: res.status, page, responseBytes: body.length }, err)
      Sentry.captureException(err, { extra: { status: res.status, page, responseBytes: body.length } })
      throw err
    }

    const json = await res.json()
    const parsed = listUsersResponseSchema.parse(json)

    allUsers.push(...parsed.data.users)
    lastKey = parsed.data.pagination.lastKey

    if (!lastKey) break // No more pages
  }

  return {
    users: allUsers,
    pagination: { total: allUsers.length, limit: PAGE_LIMIT, lastKey: null },
  }
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify a Parchment webhook signature.
 *
 * Header format: `t=<timestamp>,v1=<hmac_hex>`
 * Signed payload: `<timestamp>.<raw_body>`
 * Algorithm: HMAC-SHA256 with timing-safe comparison.
 * Replay window: 300 seconds (5 minutes).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): { valid: boolean; error?: string } {
  // Parse header: t=...,v1=...
  const parts = signatureHeader.split(",")
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2)
  const signature = parts.find((p) => p.startsWith("v1="))?.slice(3)

  if (!timestamp || !signature) {
    return { valid: false, error: "Invalid signature header format" }
  }

  // Signature must be even-length hex (HMAC-SHA256 → 64 hex chars)
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length % 2 !== 0) {
    return { valid: false, error: "Signature must be hex-encoded" }
  }

  // Replay protection: 5-minute window. Reject non-numeric timestamps so a
  // malformed "t=abc" can't silently bypass the window check via NaN math.
  if (!/^\d+$/.test(timestamp)) {
    return { valid: false, error: "Timestamp must be a unix integer" }
  }
  const ts = parseInt(timestamp, 10)
  if (!Number.isFinite(ts)) {
    return { valid: false, error: "Timestamp must be a unix integer" }
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > 300) {
    return { valid: false, error: "Timestamp outside 5-minute window" }
  }

  // Compute expected HMAC
  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")

  // Timing-safe comparison
  const sigBuffer = Buffer.from(signature, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: "Signature length mismatch" }
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Signature mismatch" }
  }

  return { valid: true }
}
