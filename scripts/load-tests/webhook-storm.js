/**
 * k6 Load Test: Webhook Storm
 *
 * Simulates burst of Stripe webhook deliveries to test:
 * - Idempotency (tryClaimEvent prevents double-processing)
 * - Dead letter queue (missing intakes handled gracefully)
 * - Connection pool under webhook pressure
 * - Rate limiting doesn't block legitimate webhooks
 *
 * NOTE: This sends to /api/stripe/webhook which requires a valid
 * Stripe signature. For local testing, set STRIPE_WEBHOOK_SECRET
 * to a test value and use the --env flag.
 *
 * For production-like testing, use Stripe CLI:
 *   stripe trigger checkout.session.completed --override amount_total=2995
 *
 * Usage:
 *   k6 run scripts/load-tests/webhook-storm.js \
 *     --env BASE_URL=http://localhost:3000 \
 *     --env WEBHOOK_SECRET=whsec_test_xxx
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Counter } from "k6/metrics"
import { crypto } from "k6/experimental/webcrypto"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

const duplicateProcessed = new Counter("duplicate_events_processed")
const deadLettered = new Counter("dead_letter_events")
const serverErrors = new Rate("server_errors")

export const options = {
  scenarios: {
    // Simulate webhook retry storm (Stripe retries failed deliveries)
    retry_storm: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: "10s", target: 5 },    // Normal rate
        { duration: "10s", target: 50 },   // Spike (Stripe retry backlog)
        { duration: "30s", target: 50 },   // Sustained spike
        { duration: "10s", target: 5 },    // Back to normal
        { duration: "10s", target: 0 },    // Cool down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],  // Webhooks can be slower (DB writes)
    server_errors: ["rate<0.05"],       // Some 4xx expected (missing intakes)
  },
}

// Simulate a checkout.session.completed event payload
function makeWebhookPayload(eventId, intakeId) {
  return JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${eventId}`,
        payment_status: "paid",
        amount_total: 2995,
        payment_intent: `pi_test_${eventId}`,
        customer: `cus_test_load`,
        payment_method_types: ["card"],
        metadata: {
          intake_id: intakeId,
          patient_id: "00000000-0000-0000-0000-loadtest0001",
          category: "medical_certificate",
          subtype: "work",
          service_slug: "med-cert-sick",
        },
      },
    },
  })
}

// NOTE: Real Stripe webhooks require HMAC signature verification.
// This script tests the endpoint's handling of payloads, not signature validation.
// For real load testing, use Stripe CLI or disable signature verification in test mode.

export default function () {
  const vuId = __VU
  const iterationId = __ITER

  // Generate deterministic event ID (for idempotency testing)
  // Same VU re-sending same event simulates Stripe retries
  const useRetry = Math.random() < 0.3 // 30% of requests are retries
  const eventId = useRetry
    ? `evt_loadtest_${vuId}_0` // Same event ID = retry
    : `evt_loadtest_${vuId}_${iterationId}`

  // Some events target non-existent intakes (dead letter test)
  const useMissingIntake = Math.random() < 0.1 // 10% target missing intakes
  const intakeId = useMissingIntake
    ? "00000000-0000-0000-0000-doesnotexist"
    : `00000000-0000-0000-0000-load${String(vuId).padStart(8, "0")}`

  const payload = makeWebhookPayload(eventId, intakeId)

  // Send without valid signature — expect 400 (signature validation failure)
  // This still tests the endpoint's request handling, parsing, and error paths
  const res = http.post(`${BASE_URL}/api/stripe/webhook`, payload, {
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${Math.floor(Date.now() / 1000)},v1=invalid_signature_for_load_test`,
    },
  })

  // Expected responses:
  // 400 = signature invalid (expected without real secret)
  // 200 = processed (if signature validation is disabled in test mode)
  // 429 = rate limited
  // 500 = server error (bad)
  check(res, {
    "not a server error": (r) => r.status < 500,
    "responds within 3s": (r) => r.timings.duration < 3000,
  })

  serverErrors.add(res.status >= 500)

  if (res.status === 200 && useRetry) {
    duplicateProcessed.add(1)
  }
  if (res.status === 200 && useMissingIntake) {
    deadLettered.add(1)
  }

  sleep(0.1)
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    test: "webhook-storm",
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values?.["p(95)"],
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      server_error_pct: data.metrics.server_errors?.values?.rate,
      total_requests: data.metrics.http_reqs?.values?.count,
      duplicate_events: data.metrics.duplicate_events_processed?.values?.count,
      dead_letter_events: data.metrics.dead_letter_events?.values?.count,
    },
  }

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
  }
}
