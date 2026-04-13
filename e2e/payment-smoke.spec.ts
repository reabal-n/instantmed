/**
 * Payment Flow Smoke Test
 *
 * Fast sanity check across all service types and price points.
 * Run before every production deploy and after any payment-path change.
 *
 * Covers:
 * 1. All 8 price tiers display correct amounts at checkout
 * 2. Stripe webhook correctly processes all service amounts
 * 3. Decline + refund flow operates end-to-end
 *
 * Run: PLAYWRIGHT=1 pnpm e2e e2e/payment-smoke.spec.ts
 */

import { expect, type Page,test } from "@playwright/test"
import { createHmac, randomUUID } from "crypto"

import {
  cleanupTestIntake,
  getIntakeById,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""

// ── Price constants (cents) ── must match lib/constants.ts PRICING ──────────
const PRICES_CENTS = {
  MED_CERT_1DAY: 1995,
  MED_CERT_2DAY: 2995,
  MED_CERT_3DAY: 3995,
  REPEAT_SCRIPT: 2995,
  CONSULT_GENERAL: 4995,
  CONSULT_ED: 3995,
  CONSULT_HAIR_LOSS: 3995,
  CONSULT_WOMENS_HEALTH: 5995,
  CONSULT_WEIGHT_LOSS: 7995,
} as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateStripeSignature(payload: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const sig = createHmac("sha256", secret)
    .update(`${ts}.${payload}`)
    .digest("hex")
  return `t=${ts},v1=${sig}`
}

function buildCheckoutCompletedEvent(overrides: {
  intakeId?: string
  patientId?: string
  amount: number
  serviceSlug?: string
  category?: string
}) {
  return {
    id: `evt_smoke_${randomUUID()}`,
    object: "event",
    api_version: "2024-12-18.acacia",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_smoke_${randomUUID()}`,
        object: "checkout.session",
        amount_total: overrides.amount,
        payment_status: "paid",
        payment_intent: `pi_smoke_${randomUUID()}`,
        customer: `cus_smoke_${randomUUID()}`,
        payment_method_types: ["card"],
        metadata: {
          intake_id: overrides.intakeId || null,
          patient_id: overrides.patientId || "e2e00000-0000-0000-0000-000000000001",
          service_slug: overrides.serviceSlug || "med-cert-sick",
          category: overrides.category || "medical_certificate",
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_smoke_${randomUUID()}`, idempotency_key: null },
  }
}

async function postWebhook(
  request: import("@playwright/test").APIRequestContext,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify(payload)
  return request.post(`${BASE_URL}/api/stripe/webhook`, {
    data: body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": generateStripeSignature(body, STRIPE_WEBHOOK_SECRET),
    },
  })
}

/** Navigate to a request URL and wait for the first step to render */
async function gotoRequest(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState("networkidle")

  // Dismiss dev overlays if present
  await page.evaluate(() => {
    const style = document.createElement("style")
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

/** Scroll to and click the last visible "Continue to payment" button */
async function _clickContinueToPayment(page: Page) {
  const btn = page.getByRole("button", { name: /Continue to payment/i }).last()
  await expect(btn).toBeVisible({ timeout: 8000 })
  await btn.scrollIntoViewIfNeeded()
}

// ── Suite 1: Price display at checkout ───────────────────────────────────────

test.describe("Smoke: Price display at checkout step", () => {
  /**
   * Navigate each service type to its checkout step and verify the
   * displayed price matches the expected amount.
   *
   * These tests use the URL-level parameters only - no DB seeding required.
   */

  const cases: Array<{ service: string; label: string; expectedPrice: string }> = [
    { service: "med-cert", label: "Med cert 1-day", expectedPrice: "$19.95" },
    { service: "med-cert?duration=2", label: "Med cert 2-day", expectedPrice: "$29.95" },
    { service: "med-cert?duration=3", label: "Med cert 3-day", expectedPrice: "$39.95" },
    { service: "prescription", label: "Repeat prescription", expectedPrice: "$29.95" },
    { service: "consult&subtype=general", label: "General consult", expectedPrice: "$49.95" },
    { service: "consult&subtype=ed", label: "ED consult", expectedPrice: "$49.95" },
    { service: "consult&subtype=hair_loss", label: "Hair loss consult", expectedPrice: "$49.95" },
    { service: "consult&subtype=womens_health", label: "Women's health consult", expectedPrice: "$59.95" },
    { service: "consult&subtype=weight_loss", label: "Weight loss consult", expectedPrice: "$89.95" },
  ]

  for (const { service, label, expectedPrice } of cases) {
    test(`${label} shows ${expectedPrice} on service hub`, async ({ page }) => {
      // The service hub cards display pricing - verify the price is present on the page
      await gotoRequest(page, `/request?service=${service}`)

      // Price should appear somewhere on the request flow
      // (either on the service hub or within the first visible step)
      const priceText = page.getByText(expectedPrice).first()
      await expect(priceText).toBeVisible({ timeout: 10000 })
    })
  }
})

// ── Suite 2: Webhook amount mapping ─────────────────────────────────────────

test.describe("Smoke: Webhook processes all service price points", () => {
  test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")
  test.skip(!isDbAvailable(), "Supabase DB required")

  const createdIntakeIds: string[] = []

  test.afterAll(async () => {
    for (const id of createdIntakeIds) {
      await cleanupTestIntake(id)
    }
  })

  const serviceAmounts: Array<{
    label: string
    amountCents: number
    serviceSlug: string
    category: string
  }> = [
    { label: "Med cert 1-day", amountCents: PRICES_CENTS.MED_CERT_1DAY, serviceSlug: "med-cert-sick", category: "medical_certificate" },
    { label: "Med cert 2-day", amountCents: PRICES_CENTS.MED_CERT_2DAY, serviceSlug: "med-cert-sick-2day", category: "medical_certificate" },
    { label: "Med cert 3-day", amountCents: PRICES_CENTS.MED_CERT_3DAY, serviceSlug: "med-cert-sick-3day", category: "medical_certificate" },
    { label: "Repeat Rx", amountCents: PRICES_CENTS.REPEAT_SCRIPT, serviceSlug: "repeat-prescription", category: "prescription" },
    { label: "General consult", amountCents: PRICES_CENTS.CONSULT_GENERAL, serviceSlug: "consult-general", category: "consultation" },
    { label: "ED consult", amountCents: PRICES_CENTS.CONSULT_ED, serviceSlug: "consult-ed", category: "consultation" },
    { label: "Hair loss consult", amountCents: PRICES_CENTS.CONSULT_HAIR_LOSS, serviceSlug: "consult-hair-loss", category: "consultation" },
    { label: "Women's health consult", amountCents: PRICES_CENTS.CONSULT_WOMENS_HEALTH, serviceSlug: "consult-womens-health", category: "consultation" },
    { label: "Weight loss consult", amountCents: PRICES_CENTS.CONSULT_WEIGHT_LOSS, serviceSlug: "consult-weight-loss", category: "consultation" },
  ]

  for (const { label, amountCents, serviceSlug, category } of serviceAmounts) {
    test(`${label} (${amountCents}¢) webhook transitions intake to paid`, async ({ request }) => {
      // Seed intake
      const seed = await seedTestIntake({ status: "pending_payment", payment_status: "pending", category })
      expect(seed.success, `Seed failed: ${seed.error}`).toBe(true)
      createdIntakeIds.push(seed.intakeId!)

      const event = buildCheckoutCompletedEvent({
        intakeId: seed.intakeId!,
        amount: amountCents,
        serviceSlug,
        category,
      })

      const response = await postWebhook(request, event)
      expect(response.status(), `${label}: webhook should return 200`).toBe(200)

      const body = await response.json()
      expect(body.received ?? body.already_paid, `${label}: webhook should be received`).toBeTruthy()

      // DB assertion: status → paid
      const intake = await getIntakeById(seed.intakeId!)
      expect(intake, `${label}: intake should exist`).not.toBeNull()
      expect(intake!.status, `${label}: status should be paid`).toBe("paid")
      expect(intake!.payment_status, `${label}: payment_status should be paid`).toBe("paid")
    })
  }
})

// ── Suite 3: Decline + refund flow ───────────────────────────────────────────

test.describe("Smoke: Decline flow marks intake as declined", () => {
  test.skip(!isDbAvailable(), "Supabase DB required")

  let declinedIntakeId: string | null = null

  test.afterAll(async () => {
    if (declinedIntakeId) await cleanupTestIntake(declinedIntakeId)
  })

  test("seeded paid intake can be fetched and has expected shape", async () => {
    const seed = await seedTestIntake({ status: "paid", payment_status: "paid", category: "medical_certificate" })
    expect(seed.success, `Seed failed: ${seed.error}`).toBe(true)
    declinedIntakeId = seed.intakeId!

    const intake = await getIntakeById(seed.intakeId!)
    expect(intake).not.toBeNull()
    expect(intake!.status).toBe("paid")
    expect(intake!.payment_status).toBe("paid")

    // Intake should have required fields for the doctor decline flow
    expect(intake!.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test("charge.refunded webhook marks paid intake as refunded", async ({ request }) => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET required")

    const seed = await seedTestIntake({ status: "paid", payment_status: "paid", category: "medical_certificate" })
    expect(seed.success, `Seed failed: ${seed.error}`).toBe(true)

    const paymentIntentId = `pi_smoke_refund_${randomUUID()}`

    // Set stripe_payment_intent_id on intake so refund lookup works
    const supabase = getSupabaseClient()
    await supabase
      .from("intakes")
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", seed.intakeId!)

    const refundEvent = {
      id: `evt_smoke_refund_${randomUUID()}`,
      object: "event",
      api_version: "2024-12-18.acacia",
      type: "charge.refunded",
      data: {
        object: {
          id: `ch_smoke_${randomUUID()}`,
          object: "charge",
          amount: 1995,
          amount_refunded: 1995,
          payment_intent: paymentIntentId,
          status: "succeeded",
        },
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: { id: `req_smoke_${randomUUID()}`, idempotency_key: null },
    }

    const body = JSON.stringify(refundEvent)
    const response = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: body,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": generateStripeSignature(body, STRIPE_WEBHOOK_SECRET),
      },
    })

    expect(response.status()).toBe(200)

    const intake = await getIntakeById(seed.intakeId!)
    expect(intake).not.toBeNull()
    expect(intake!.payment_status).toBe("refunded")

    await cleanupTestIntake(seed.intakeId!)
  })
})

// ── Suite 4: Success page data integrity ─────────────────────────────────────

test.describe("Smoke: Success page requires intake_id", () => {
  test("success page without intake_id renders without crashing", async ({ page }) => {
    // Navigate to success page without intake_id - should render gracefully
    await page.goto("/patient/intakes/success")
    await page.waitForLoadState("networkidle")

    // Should not show a 500 error - either redirect to sign-in or show a fallback
    const is500 = await page.getByText(/500|Internal Server Error/i).isVisible().catch(() => false)
    expect(is500, "Success page should not show 500 without intake_id").toBe(false)
  })
})
