/**
 * Parchment Webhook E2E Tests
 *
 * Tests the webhook endpoint at /api/webhooks/parchment by constructing
 * valid HMAC-SHA256 signatures and POSTing directly to the handler.
 *
 * Covers:
 * - Signature verification (valid, invalid, missing, expired)
 * - prescription.created: intake transitions to script_sent
 * - Non-prescription events are acknowledged but ignored
 * - Patient not found: returns 200 with warning
 * - Idempotency: duplicate SCIDs are skipped
 *
 * Prerequisites:
 * - PARCHMENT_WEBHOOK_SECRET must be set in .env.local
 * - SUPABASE_SERVICE_ROLE_KEY must be set for DB assertions
 */

import { createHmac, randomUUID } from "crypto"
import { test, expect } from "@playwright/test"
import {
  isDbAvailable,
  seedTestIntake,
  cleanupTestIntake,
  getIntakeById,
} from "./helpers/db"

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"
const PARCHMENT_WEBHOOK_SECRET = process.env.PARCHMENT_WEBHOOK_SECRET || ""
const PARCHMENT_ORGANIZATION_ID = process.env.PARCHMENT_ORGANIZATION_ID || "test-org-id"
const PARCHMENT_PARTNER_ID = process.env.PARCHMENT_PARTNER_ID || "test-partner-id"

// ============================================================================
// PARCHMENT SIGNATURE HELPERS
// ============================================================================

/**
 * Generate a valid Parchment webhook signature.
 * Format: t=<unix_timestamp>,v1=<hmac_sha256_hex>
 * Signed payload: "<timestamp>.<raw_body>"
 */
function generateParchmentSignature(
  payload: string,
  secret: string,
  timestamp?: number,
): string {
  const ts = timestamp || Math.floor(Date.now() / 1000)
  const signedPayload = `${ts}.${payload}`
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")
  return `t=${ts},v1=${signature}`
}

/**
 * Build a Parchment prescription.created webhook payload.
 */
function buildPrescriptionCreatedEvent(overrides: {
  eventId?: string
  eventType?: string
  patientId?: string
  partnerPatientId?: string
  userId?: string
  scid?: string
  organizationId?: string
  partnerId?: string
}) {
  return {
    event_type: overrides.eventType || "prescription.created",
    event_id: overrides.eventId || `evt_${randomUUID()}`,
    timestamp: new Date().toISOString(),
    partner_id: overrides.partnerId || PARCHMENT_PARTNER_ID,
    organization_id: overrides.organizationId || PARCHMENT_ORGANIZATION_ID,
    data: {
      patient_id: overrides.patientId || `parch_pat_${randomUUID()}`,
      partner_patient_id: overrides.partnerPatientId || randomUUID(),
      user_id: overrides.userId || `parch_usr_${randomUUID()}`,
      scid: overrides.scid || `SCID-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
  }
}

// ============================================================================
// HELPER: POST to webhook endpoint
// ============================================================================

async function postWebhook(
  request: import("@playwright/test").APIRequestContext,
  payload: Record<string, unknown>,
  options?: { signature?: string; omitSignature?: boolean },
) {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (!options?.omitSignature) {
    headers["X-Webhook-Signature"] =
      options?.signature ||
      generateParchmentSignature(body, PARCHMENT_WEBHOOK_SECRET)
  }

  return request.post(`${BASE_URL}/api/webhooks/parchment`, {
    data: body,
    headers,
  })
}

// ============================================================================
// TESTS
// ============================================================================

test.describe("Parchment Webhook: Signature Verification", () => {
  test("rejects request with missing signature header", async ({ request }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")

    const payload = buildPrescriptionCreatedEvent({})
    const response = await postWebhook(request, payload, { omitSignature: true })

    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Missing signature")
  })

  test("rejects request with invalid signature", async ({ request }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")

    const payload = buildPrescriptionCreatedEvent({})
    const response = await postWebhook(request, payload, {
      signature: "t=1234567890,v1=deadbeefdeadbeefdeadbeef",
    })

    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Invalid signature")
  })

  test("rejects request with expired timestamp (replay protection)", async ({
    request,
  }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")

    const payload = buildPrescriptionCreatedEvent({})
    const body = JSON.stringify(payload)
    // Parchment uses a 5-minute window - use 10 minutes ago
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600
    const signature = generateParchmentSignature(
      body,
      PARCHMENT_WEBHOOK_SECRET,
      expiredTimestamp,
    )

    const response = await postWebhook(request, payload, { signature })

    expect(response.status()).toBe(401)
    const responseBody = await response.json()
    expect(responseBody.error).toBe("Invalid signature")
  })
})

test.describe("Parchment Webhook: Event Routing", () => {
  test("acknowledges non-prescription.created events without processing", async ({
    request,
  }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")

    const payload = buildPrescriptionCreatedEvent({
      eventType: "patient.updated",
    })
    const response = await postWebhook(request, payload)

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.received).toBe(true)
  })
})

test.describe("Parchment Webhook: prescription.created", () => {
  const testIntakeIds: string[] = []

  test.afterAll(async () => {
    for (const id of testIntakeIds) {
      await cleanupTestIntake(id)
    }
  })

  test("returns 200 with warning when patient not found", async ({
    request,
  }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required")

    const payload = buildPrescriptionCreatedEvent({
      patientId: "nonexistent-parchment-patient",
      partnerPatientId: "00000000-0000-0000-0000-000000000000",
    })
    const response = await postWebhook(request, payload)

    // Returns 200 to prevent Parchment retries
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.warning).toContain("Patient not found")
  })

  test("claims awaiting_script intake and marks script sent", async ({
    request,
  }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required")

    // Seed a test intake in awaiting_script status
    const seed = await seedTestIntake({
      status: "awaiting_script",
      payment_status: "paid",
      category: "common_scripts",
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const scid = `SCID-E2E-${Date.now().toString(36).toUpperCase()}`
    const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000001"

    const payload = buildPrescriptionCreatedEvent({
      partnerPatientId: E2E_PATIENT_ID,
      scid,
    })
    const response = await postWebhook(request, payload)

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.intakeId).toBe(seed.intakeId)

    // Verify DB state: parchment_reference set and script_sent=true
    const intake = await getIntakeById(seed.intakeId!)
    expect(intake).toBeTruthy()
    expect(intake!.parchment_reference).toBe(scid)
    expect(intake!.script_sent).toBe(true)
  })

  test("returns 200 with warning when no awaiting_script intake exists", async ({
    request,
  }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required")

    // Seed an intake that is NOT in awaiting_script status
    const seed = await seedTestIntake({
      status: "in_review",
      payment_status: "paid",
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000001"

    const payload = buildPrescriptionCreatedEvent({
      partnerPatientId: E2E_PATIENT_ID,
      scid: `SCID-NOMATCH-${randomUUID().slice(0, 8)}`,
    })
    const response = await postWebhook(request, payload)

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.warning).toContain("No awaiting_script intake found")
  })

  test("handles duplicate SCID idempotently", async ({ request }) => {
    test.skip(!PARCHMENT_WEBHOOK_SECRET, "PARCHMENT_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required")

    // Seed an intake and process it once
    const seed = await seedTestIntake({
      status: "awaiting_script",
      payment_status: "paid",
      category: "common_scripts",
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const scid = `SCID-DEDUP-${Date.now().toString(36).toUpperCase()}`
    const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000001"

    const payload = buildPrescriptionCreatedEvent({
      partnerPatientId: E2E_PATIENT_ID,
      scid,
    })

    // First call should succeed
    const response1 = await postWebhook(request, payload)
    expect(response1.status()).toBe(200)

    // Second call with same SCID should also return 200 (idempotent)
    const response2 = await postWebhook(request, payload)
    expect(response2.status()).toBe(200)
  })
})
