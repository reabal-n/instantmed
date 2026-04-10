/**
 * Parchment Health API Client
 *
 * Server-only module for communicating with the Parchment ePrescribing API.
 * Handles JWT token caching, patient CRUD, SSO URL generation, and user listing.
 *
 * Docs: https://docs.parchmenthealth.io
 */

import "server-only"

import crypto from "crypto"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import {
  parchmentTokenResponseSchema,
  parchmentSsoResponseSchema,
  createPatientResponseSchema,
  listUsersResponseSchema,
  PARCHMENT_SCOPES,
  type CreatePatientRequest,
  type CreatePatientResponse,
  type ParchmentSsoResponse,
  type ListUsersResponse,
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

let cachedToken: { accessToken: string; expiresAt: number } | null = null

/**
 * Get a valid JWT token, using cache when possible.
 * Tokens are cached with a 60s buffer before expiry.
 */
async function getToken(scopes: string[]): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid (60s buffer)
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken
  }

  const config = getConfig()

  const res = await fetch(`${config.apiUrl}/external/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": config.partnerId,
      "x-partner-secret": config.partnerSecret,
      "x-organization-id": config.organizationId,
      "x-organization-secret": config.organizationSecret,
      "x-user-id": "system", // Token requests don't require a specific user
    },
    body: JSON.stringify({
      grantType: "client_credentials",
      scope: scopes,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment token request failed: ${res.status} ${body}`)
    log.error("Token request failed", { status: res.status }, err)
    Sentry.captureException(err, { extra: { status: res.status, body } })
    throw err
  }

  const json = await res.json()
  const parsed = parchmentTokenResponseSchema.parse(json)

  cachedToken = {
    accessToken: parsed.data.accessToken,
    expiresAt: now + parsed.data.expiresIn * 1000,
  }

  log.info("Token acquired", { scopes, expiresIn: parsed.data.expiresIn })
  return cachedToken.accessToken
}

/** Force-clear the cached token (useful after 401 errors) */
export function clearTokenCache(): void {
  cachedToken = null
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
  const token = await getToken([
    PARCHMENT_SCOPES.CREATE_PATIENT,
    PARCHMENT_SCOPES.READ_PATIENT,
  ])

  const url = `${config.apiUrl}/external/v1/organizations/${config.organizationId}/users/${userId}/patients`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
    body: JSON.stringify(patient),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment create patient failed: ${res.status} ${body}`)
    log.error("Create patient failed", { status: res.status, partnerId: patient.partner_patient_id }, err)
    Sentry.captureException(err, { extra: { status: res.status, body } })
    throw err
  }

  const json = await res.json()
  const parsed = createPatientResponseSchema.parse(json)

  log.info("Patient created in Parchment", {
    parchmentPatientId: parsed.data.parchment_patient_id,
    partnerPatientId: patient.partner_patient_id,
  })

  return parsed.data
}

/**
 * Update a patient in Parchment.
 */
export async function updatePatient(
  userId: string,
  parchmentPatientId: string,
  patient: Partial<CreatePatientRequest>,
): Promise<void> {
  const config = getConfig()
  const token = await getToken([PARCHMENT_SCOPES.UPDATE_PATIENT])

  const url = `${config.apiUrl}/external/v1/organizations/${config.organizationId}/users/${userId}/patients/${parchmentPatientId}`

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
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment update patient failed: ${res.status} ${body}`)
    log.error("Update patient failed", { status: res.status, parchmentPatientId }, err)
    Sentry.captureException(err, { extra: { status: res.status, body } })
    throw err
  }

  log.info("Patient updated in Parchment", { parchmentPatientId })
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

  const res = await fetch(`${config.apiUrl}/external/v1/sso`, {
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
    const err = new Error(`Parchment SSO request failed: ${res.status} ${body}`)
    log.error("SSO request failed", { status: res.status, userId, redirectPath }, err)
    Sentry.captureException(err, { extra: { status: res.status, body } })
    throw err
  }

  const json = await res.json()
  const parsed = parchmentSsoResponseSchema.parse(json)

  log.info("SSO URL generated", { userId, redirectPath, expiresIn: parsed.data.expires_in })
  return parsed.data
}

// ============================================================================
// USERS (for account linking)
// ============================================================================

/**
 * List all users in the Parchment organization.
 * Used for linking a doctor's InstantMed account to their Parchment user.
 */
export async function listUsers(): Promise<ListUsersResponse["data"]> {
  const config = getConfig()
  const token = await getToken([PARCHMENT_SCOPES.READ_USERS])

  const url = `${config.apiUrl}/external/v1/organizations/${config.organizationId}/users?limit=100`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Parchment list users failed: ${res.status} ${body}`)
    log.error("List users failed", { status: res.status }, err)
    Sentry.captureException(err, { extra: { status: res.status, body } })
    throw err
  }

  const json = await res.json()
  const parsed = listUsersResponseSchema.parse(json)

  return parsed.data
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

  // Replay protection: 5-minute window
  const ts = parseInt(timestamp, 10)
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
