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
// PRODUCTION GUARD
// ============================================================================
// This test constructs fake Stripe events signed with the real STRIPE_WEBHOOK_SECRET
// and posts them directly to the webhook endpoint. Running against instantmed.com.au
// writes fake DLQ entries to the production database.
// See CLAUDE.md gotcha: "payment-smoke.spec.ts must never run against production"
const PRODUCTION_HOSTS = ["instantmed.com.au", "www.instantmed.com.au"]
const rawBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"
if (PRODUCTION_HOSTS.some((host) => rawBaseUrl.includes(host))) {
  throw new Error(
    `[stripe-webhook.spec.ts] Refusing to run against production URL: ${rawBaseUrl}. ` +
    "This test POSTs fake signed Stripe events to the webhook endpoint and will flood the DLQ.",
  )
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = rawBaseUrl
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
  const amountRefunded = overrides.amountRefunded ?? amount
  const chargeId = overrides.chargeId || `ch_test_${randomUUID()}`
  const paymentIntentId = overrides.paymentIntentId || `pi_test_${randomUUID()}`
  const refundId = `re_test_${randomUUID()}`
  const balanceTransactionId = `txn_test_${randomUUID()}`
  const created = Math.floor(Date.now() / 1000)
  const paymentIntent = {
    id: paymentIntentId,
    object: "payment_intent",
    metadata: {},
  }
  return {
    id: overrides.eventId || `evt_test_${randomUUID()}`,
    object: "event",
    api_version: "2024-12-18.acacia",
    type: "charge.refunded",
    data: {
      object: {
        id: chargeId,
        object: "charge",
        amount,
        amount_refunded: amountRefunded,
        payment_intent: paymentIntent,
        refunds: {
          object: "list",
          data: [{
            id: refundId,
            object: "refund",
            amount: amountRefunded,
            balance_transaction: {
              id: balanceTransactionId,
              object: "balance_transaction",
              amount: -amountRefunded,
              available_on: created,
              balance_type: "payments",
              created,
              currency: "aud",
              description: null,
              exchange_rate: null,
              fee: 0,
              fee_details: [],
              net: -amountRefunded,
              reporting_category: "refund",
              source: refundId,
              status: "available",
              type: "refund",
            },
            charge: chargeId,
            created,
            currency: "aud",
            metadata: {},
            payment_intent: paymentIntent,
            reason: "requested_by_customer",
            receipt_number: null,
            source_transfer_reversal: null,
            status: "succeeded",
            transfer_reversal: null,
          }],
          has_more: false,
          url: `/v1/charges/${chargeId}/refunds`,
        },
        status: "succeeded",
      },
    },
    created,
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_test_${randomUUID()}`, idempotency_key: null },
  }
}

function buildRefundLifecycleEvent(input: {
  amount: number
  balanceTransactionId: string
  chargeId: string
  eventCreated: number
  eventId: string
  eventType: "refund.created" | "refund.updated"
  intakeId: string
  paymentId: string
  paymentIntentId: string
  refundCreated: number
  refundId: string
  status: "pending" | "succeeded"
}) {
  const paymentIntent = {
    id: input.paymentIntentId,
    object: "payment_intent",
    metadata: {},
  }
  const balanceTransaction = input.status === "succeeded"
    ? {
        id: input.balanceTransactionId,
        object: "balance_transaction",
        amount: -input.amount,
        available_on: input.eventCreated,
        balance_type: "payments",
        created: input.eventCreated,
        currency: "aud",
        description: null,
        exchange_rate: null,
        fee: 0,
        fee_details: [],
        net: -input.amount,
        reporting_category: "refund",
        source: input.refundId,
        status: "available",
        type: "refund",
      }
    : null

  return {
    id: input.eventId,
    object: "event",
    api_version: "2024-12-18.acacia",
    type: input.eventType,
    data: {
      object: {
        id: input.refundId,
        object: "refund",
        amount: input.amount,
        balance_transaction: balanceTransaction,
        charge: {
          id: input.chargeId,
          object: "charge",
          payment_intent: paymentIntent,
        },
        created: input.refundCreated,
        currency: "aud",
        failure_balance_transaction: null,
        metadata: {
          intake_id: input.intakeId,
          payment_id: input.paymentId,
          refund_type: "admin_manual",
        },
        payment_intent: paymentIntent,
        reason: "requested_by_customer",
        receipt_number: null,
        source_transfer_reversal: null,
        status: input.status,
        transfer_reversal: null,
      },
    },
    created: input.eventCreated,
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

    const sessionId = `cs_test_${randomUUID()}`

    // Seed a test intake with pending payment status
    const seed = await seedTestIntake({
      status: "pending_payment",
      payment_status: "pending",
      payment_id: sessionId,
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const paymentIntentId = `pi_test_${randomUUID()}`
    const customerId = `cus_test_${randomUUID()}`

    // Build and send the webhook event
    const event = buildCheckoutCompletedEvent({
      sessionId,
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

    const sessionId = `cs_test_${randomUUID()}`

    // Seed a test intake
    const seed = await seedTestIntake({
      status: "pending_payment",
      payment_status: "pending",
      payment_id: sessionId,
    })
    expect(seed.success).toBe(true)
    testIntakeIds.push(seed.intakeId!)

    const fixedEventId = `evt_idempotent_${randomUUID()}`
    const event = buildCheckoutCompletedEvent({
      eventId: fixedEventId,
      sessionId,
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
      .update({
        amount_cents: 1995,
        stripe_payment_intent_id: paymentIntentId,
      })
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
      .update({
        amount_cents: 1995,
        stripe_payment_intent_id: paymentIntentId,
      })
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

test.describe("Stripe Webhook: refund lifecycle fallback", () => {
  const fixtures: Array<{
    eventIds: string[]
    intakeId: string
    paymentId: string
  }> = []

  test.afterAll(async () => {
    if (!isDbAvailable()) return
    const supabase = getSupabaseClient()
    for (const fixture of fixtures) {
      await supabase
        .from("stripe_webhook_events")
        .delete()
        .in("event_id", fixture.eventIds)
      await supabase.from("payments").delete().eq("id", fixture.paymentId)
      await cleanupTestIntake(fixture.intakeId)
    }
  })

  test("settles and emails once when only payment linkage and Refund metadata identify the intake", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
    test.skip(!isDbAvailable(), "Supabase credentials required for DB assertions")

    const amount = 1_995
    const balanceTransactionId = `txn_test_${randomUUID()}`
    const chargeId = `ch_test_${randomUUID()}`
    const pendingEventId = `evt_test_${randomUUID()}`
    const succeededEventId = `evt_test_${randomUUID()}`
    const paymentId = randomUUID()
    const paymentIntentId = `pi_test_refund_fallback_${randomUUID()}`
    const refundId = `re_test_${randomUUID()}`
    const sessionId = `cs_test_${randomUUID()}`
    const refundCreated = Math.floor(Date.now() / 1000) - 60

    const seed = await seedTestIntake({
      payment_id: sessionId,
      payment_status: "paid",
      refund_status: "not_applicable",
      status: "paid",
    })
    expect(seed.success, `Seed should succeed: ${seed.error}`).toBe(true)
    const intakeId = seed.intakeId!
    fixtures.push({
      eventIds: [pendingEventId, succeededEventId],
      intakeId,
      paymentId,
    })

    const supabase = getSupabaseClient()
    const { error: intakeSetupError } = await supabase
      .from("intakes")
      .update({
        amount_cents: amount,
        refund_amount_cents: 0,
        refund_status: "not_applicable",
        refund_stripe_id: null,
        refunded_at: null,
        stripe_payment_intent_id: null,
      })
      .eq("id", intakeId)
    expect(intakeSetupError, "Intake fallback fixture should be writable").toBeNull()

    const { error: paymentSetupError } = await supabase.from("payments").insert({
      id: paymentId,
      amount,
      currency: "aud",
      intake_id: intakeId,
      refund_amount: 0,
      refund_status: "not_applicable",
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: sessionId,
    })
    expect(paymentSetupError, "Linked payment fixture should be writable").toBeNull()

    const { data: beforeRefund, error: beforeRefundError } = await supabase
      .from("intakes")
      .select("stripe_payment_intent_id")
      .eq("id", intakeId)
      .single()
    expect(beforeRefundError).toBeNull()
    expect(beforeRefund?.stripe_payment_intent_id).toBeNull()

    const exactOutboxKey = `stripe-refund-processed:${intakeId}:${refundId}`
    const pendingEvent = buildRefundLifecycleEvent({
      amount,
      balanceTransactionId,
      chargeId,
      eventCreated: refundCreated,
      eventId: pendingEventId,
      eventType: "refund.created",
      intakeId,
      paymentId,
      paymentIntentId,
      refundCreated,
      refundId,
      status: "pending",
    })
    const pendingResponse = await postWebhook(request, pendingEvent)
    expect(pendingResponse.status()).toBe(200)

    const { data: pendingEmails, error: pendingEmailError } = await supabase
      .from("email_outbox")
      .select("id")
      .eq("idempotency_key", exactOutboxKey)
    expect(pendingEmailError).toBeNull()
    expect(pendingEmails).toEqual([])

    const succeededEvent = buildRefundLifecycleEvent({
      amount,
      balanceTransactionId,
      chargeId,
      eventCreated: refundCreated + 30,
      eventId: succeededEventId,
      eventType: "refund.updated",
      intakeId,
      paymentId,
      paymentIntentId,
      refundCreated,
      refundId,
      status: "succeeded",
    })
    const succeededResponse = await postWebhook(request, succeededEvent)
    expect(succeededResponse.status()).toBe(200)

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(
        "payment_status, refund_amount_cents, refund_status, " +
        "refund_stripe_id, refunded_at, stripe_payment_intent_id",
      )
      .eq("id", intakeId)
      .single()
    expect(intakeError).toBeNull()
    const intakeMirror = intake as unknown as {
      payment_status: string
      refund_amount_cents: number
      refund_status: string
      refund_stripe_id: string
      refunded_at: string | null
      stripe_payment_intent_id: string
    } | null
    expect(intakeMirror).toMatchObject({
      payment_status: "refunded",
      refund_amount_cents: amount,
      refund_status: "succeeded",
      refund_stripe_id: refundId,
      stripe_payment_intent_id: paymentIntentId,
    })
    expect(intakeMirror?.refunded_at).toBeTruthy()

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("status, refund_amount, refund_status, stripe_refund_id, refunded_at")
      .eq("id", paymentId)
      .single()
    expect(paymentError).toBeNull()
    const paymentMirror = payment as unknown as {
      refund_amount: number
      refund_status: string
      refunded_at: string | null
      status: string
      stripe_refund_id: string
    } | null
    expect(paymentMirror).toMatchObject({
      refund_amount: amount,
      refund_status: "refunded",
      status: "refunded",
      stripe_refund_id: refundId,
    })
    expect(paymentMirror?.refunded_at).toBeTruthy()

    const readExactOutbox = () => supabase
      .from("email_outbox")
      .select("email_type, idempotency_key, metadata, status")
      .eq("idempotency_key", exactOutboxKey)
    const firstOutboxRead = await readExactOutbox()
    expect(firstOutboxRead.error).toBeNull()
    expect(firstOutboxRead.data).toHaveLength(1)
    expect(firstOutboxRead.data?.[0]).toMatchObject({
      email_type: "refund-processed",
      idempotency_key: exactOutboxKey,
      metadata: {
        refund_amount_cents: amount,
        refund_livemode: false,
        stripe_refund_id: refundId,
      },
      status: "pending",
    })

    const replayResponse = await postWebhook(request, succeededEvent)
    expect(replayResponse.status()).toBe(200)
    await expect(replayResponse.json()).resolves.toMatchObject({ skipped: true })

    const replayOutboxRead = await readExactOutbox()
    expect(replayOutboxRead.error).toBeNull()
    expect(replayOutboxRead.data).toHaveLength(1)
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
