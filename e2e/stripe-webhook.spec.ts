/**
 * Stripe Webhook Handler E2E Tests
 *
 * Tests the webhook endpoint at /api/stripe/webhook by constructing
 * valid Stripe signatures and POSTing directly to the handler.
 *
 * Covers:
 * - checkout.session.completed: intake transitions to "paid"
 * - charge.refunded: refund status is recorded
 * - Invalid signature: returns 400
 * - Missing signature: returns 400
 * - Idempotency: duplicate events are skipped
 *
 * Prerequisites:
 * - Run `pnpm e2e:seed` to create test data
 * - STRIPE_WEBHOOK_SECRET must be set in .env.local
 * - SUPABASE_SERVICE_ROLE_KEY must be set for DB assertions
 */

import { expect,test } from "@playwright/test"
import { createHmac, randomUUID } from "crypto"

import {
  cleanupTestIntake,
  getIntakeById,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""

// ============================================================================
// STRIPE SIGNATURE HELPERS
// ============================================================================

/**
 * Generate a valid Stripe webhook signature for a given payload.
 * Replicates the algorithm used by Stripe's SDK:
 *   signature = HMAC-SHA256(secret, "${timestamp}.${payload}")
 *   header = "t=${timestamp},v1=${signature}"
 */
function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp || Math.floor(Date.now() / 1000)
  const signedPayload = `${ts}.${payload}`
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")
  return `t=${ts},v1=${signature}`
}

/**
 * Build a minimal Stripe checkout.session.completed event payload.
 */
function buildCheckoutCompletedEvent(overrides: {
  eventId?: string
  sessionId?: string
  intakeId?: string
  patientId?: string
  amount?: number
  paymentStatus?: string
  paymentIntent?: string
  customer?: string
}) {
  return {
    id: overrides.eventId || `evt_test_${randomUUID()}`,
    object: "event",
    api_version: "2024-12-18.acacia",
    type: "checkout.session.completed",
    data: {
      object: {
        id: overrides.sessionId || `cs_test_${randomUUID()}`,
        object: "checkout.session",
        amount_total: overrides.amount || 1995,
        payment_status: overrides.paymentStatus || "paid",
        payment_intent: overrides.paymentIntent || `pi_test_${randomUUID()}`,
        customer: overrides.customer || `cus_test_${randomUUID()}`,
        payment_method_types: ["card"],
        metadata: {
          intake_id: overrides.intakeId || null,
          patient_id: overrides.patientId || null,
          service_slug: "med-cert-sick",
          category: "medical_certificate",
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_test_${randomUUID()}`, idempotency_key: null },
  }
}

/**
 * Build a minimal Stripe charge.refunded event payload.
 */
function buildChargeRefundedEvent(overrides: {
  eventId?: string
  chargeId?: string
  paymentIntentId?: string
  amount?: number
  amountRefunded?: number
}) {
  const amount = overrides.amount || 1995
  return {
    id: overrides.eventId || `evt_test_${randomUUID()}`,
    object: "event",
    api_version: "2024-12-18.acacia",
    type: "charge.refunded",
    data: {
      object: {
        id: overrides.chargeId || `ch_test_${randomUUID()}`,
        object: "charge",
        amount,
        amount_refunded: overrides.amountRefunded ?? amount,
        payment_intent: overrides.paymentIntentId || `pi_test_${randomUUID()}`,
        status: "succeeded",
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_test_${randomUUID()}`, idempotency_key: null },
  }
}

// ============================================================================
// HELPER: POST to webhook endpoint
// ============================================================================

async function postWebhook(
  request: import("@playwright/test").APIRequestContext,
  payload: Record<string, unknown>,
  options?: { signature?: string; omitSignature?: boolean }
) {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (!options?.omitSignature) {
    headers["stripe-signature"] =
      options?.signature || generateStripeSignature(body, STRIPE_WEBHOOK_SECRET)
  }

  return request.post(`${BASE_URL}/api/stripe/webhook`, {
    data: body,
    headers,
  })
}

// ============================================================================
// TESTS
// ============================================================================

test.describe("Stripe Webhook: Signature Verification", () => {
  test("rejects request with missing stripe-signature header", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const payload = buildCheckoutCompletedEvent({})
    const response = await postWebhook(request, payload, { omitSignature: true })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("Missing signature")
  })

  test("rejects request with invalid stripe-signature", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const payload = buildCheckoutCompletedEvent({})
    const response = await postWebhook(request, payload, {
      signature: "t=1234567890,v1=invalid_signature_hex",
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("Invalid signature")
  })

  test("rejects request with expired timestamp signature", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const payload = buildCheckoutCompletedEvent({})
    const body = JSON.stringify(payload)
    // Stripe's default tolerance is 300 seconds - use a timestamp 10 minutes in the past
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600
    const signature = generateStripeSignature(body, STRIPE_WEBHOOK_SECRET, expiredTimestamp)

    const response = await postWebhook(request, payload, { signature })

    expect(response.status()).toBe(400)
    const responseBody = await response.json()
    expect(responseBody.error).toBe("Invalid signature")
  })
})

test.describe("Stripe Webhook: checkout.session.completed", () => {
  const testIntakeIds: string[] = []

  test.afterAll(async () => {
    // Clean up all test intakes created during this suite
    for (const id of testIntakeIds) {
      await cleanupTestIntake(id)
    }
  })

  test("transitions intake from pending_payment to paid", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    // Seed a test intake with pending payment status
    const seed = await seedTestIntake({
      status: "pending_payment",
      payment_status: "pending",
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const paymentIntentId = `pi_test_${randomUUID()}`
    const customerId = `cus_test_${randomUUID()}`

    // Build and send the webhook event
    const event = buildCheckoutCompletedEvent({
      intakeId: seed.intakeId!,
      patientId: "e2e00000-0000-0000-0000-000000000001", // E2E patient
      amount: 1995,
      paymentIntent: paymentIntentId,
      customer: customerId,
    })

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    const responseBody = await response.json()
    expect(responseBody.received).toBe(true)

    // Verify DB state: intake should now be "paid"
    const intake = await getIntakeById(seed.intakeId!)
    expect(intake, "Intake should exist").not.toBeNull()
    expect(intake!.status).toBe("paid")
    expect(intake!.payment_status).toBe("paid")
  })

  test("skips async payment methods (payment_status=unpaid)", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const event = buildCheckoutCompletedEvent({
      intakeId: randomUUID(),
      paymentStatus: "unpaid", // BECS Direct Debit sends this
    })

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("async_payment_pending")
  })

  test("handles missing intake_id in metadata gracefully", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const event = buildCheckoutCompletedEvent({})
    // Remove intake_id from metadata
    ;(event.data.object.metadata as Record<string, unknown>).intake_id = null

    const response = await postWebhook(request, event)
    // Handler returns 200 with error field for missing intake_id (doesn't want Stripe retries)
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.error).toBe("Missing intake_id")
  })

  test("handles non-existent intake_id", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    const fakeIntakeId = "00000000-0000-0000-0000-000000000000"
    const event = buildCheckoutCompletedEvent({
      intakeId: fakeIntakeId,
    })

    const response = await postWebhook(request, event)
    // First attempt returns 500 to trigger Stripe retry (intake might be created by slow request)
    expect(response.status()).toBe(500)

    const body = await response.json()
    expect(body.error).toBe("Intake not found")
  })

  test("is idempotent - duplicate events are skipped", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    // Seed a test intake
    const seed = await seedTestIntake({
      status: "pending_payment",
      payment_status: "pending",
    })
    expect(seed.success).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const fixedEventId = `evt_idempotent_${randomUUID()}`
    const event = buildCheckoutCompletedEvent({
      eventId: fixedEventId,
      intakeId: seed.intakeId!,
      patientId: "e2e00000-0000-0000-0000-000000000001",
    })

    // First request - should process
    const response1 = await postWebhook(request, event)
    expect(response1.status()).toBe(200)

    // Second request with same event ID - should be skipped
    const response2 = await postWebhook(request, event)
    expect(response2.status()).toBe(200)

    const body2 = await response2.json()
    expect(body2.skipped).toBe(true)
  })

  test("guards against double-marking as paid", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    // Seed a test intake already marked as paid
    const seed = await seedTestIntake({
      status: "paid",
      payment_status: "paid",
    })
    expect(seed.success).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const event = buildCheckoutCompletedEvent({
      intakeId: seed.intakeId!,
      patientId: "e2e00000-0000-0000-0000-000000000001",
    })

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.already_paid).toBe(true)
  })
})

test.describe("Stripe Webhook: charge.refunded", () => {
  const testIntakeIds: string[] = []

  test.afterAll(async () => {
    for (const id of testIntakeIds) {
      await cleanupTestIntake(id)
    }
  })

  test("records full refund status on intake", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    const paymentIntentId = `pi_test_refund_${randomUUID()}`

    // Seed a paid intake with the stripe_payment_intent_id set
    const seed = await seedTestIntake({
      status: "paid",
      payment_status: "paid",
    })
    expect(seed.success).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    // Manually set stripe_payment_intent_id on the intake
    const supabase = getSupabaseClient()
    await supabase
      .from("intakes")
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", seed.intakeId!)

    // Send refund webhook
    const event = buildChargeRefundedEvent({
      paymentIntentId,
      amount: 1995,
      amountRefunded: 1995, // Full refund
    })

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    // Verify DB: payment_status should be "refunded"
    const intake = await getIntakeById(seed.intakeId!)
    expect(intake).not.toBeNull()
    expect(intake!.payment_status).toBe("refunded")
  })

  test("records partial refund status on intake", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    const paymentIntentId = `pi_test_partial_${randomUUID()}`

    const seed = await seedTestIntake({
      status: "paid",
      payment_status: "paid",
    })
    expect(seed.success).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const supabase = getSupabaseClient()
    await supabase
      .from("intakes")
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", seed.intakeId!)

    // Send partial refund webhook
    const event = buildChargeRefundedEvent({
      paymentIntentId,
      amount: 1995,
      amountRefunded: 500, // Partial refund
    })

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    // Verify DB: payment_status should be "partially_refunded"
    const intake = await getIntakeById(seed.intakeId!)
    expect(intake).not.toBeNull()
    expect(intake!.payment_status).toBe("partially_refunded")
  })
})

test.describe("Stripe Webhook: Unhandled Event Types", () => {
  test("returns 200 received:true for unhandled event types", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const event = {
      id: `evt_test_${randomUUID()}`,
      object: "event",
      api_version: "2024-12-18.acacia",
      type: "customer.subscription.updated", // Not in handlers map
      data: {
        object: {
          id: `sub_test_${randomUUID()}`,
          object: "subscription",
        },
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: { id: `req_test_${randomUUID()}`, idempotency_key: null },
    }

    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.received).toBe(true)
  })
})
