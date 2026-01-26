# InstantMed Checkout & Payments Audit

> **Date:** January 2026  
> **Scope:** Checkout creation, webhooks, intake linkage, retry flows, invoice handling, idempotency, duplicate protection

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Payment Flow Trace](#2-payment-flow-trace)
3. [Double Charge / Double Intake Analysis](#3-double-charge--double-intake-analysis)
4. [Webhook Security & DLQ](#4-webhook-security--dlq)
5. [Observability Analysis](#5-observability-analysis)
6. [Retry Payment Flow](#6-retry-payment-flow)
7. [Invoice Download & History](#7-invoice-download--history)
8. [Recommendations](#8-recommendations)

---

## 1. Executive Summary

The InstantMed checkout and payment system is **well-architected** with multiple layers of protection against duplicate charges and orphaned intakes. The implementation includes atomic idempotency checks, dead letter queue (DLQ) handling, and comprehensive Sentry integration.

### Overall Assessment

| Area | Status | Risk |
|------|--------|------|
| Checkout creation | ✅ Solid | Low |
| Webhook idempotency | ✅ Atomic | Low |
| DLQ handling | ✅ Complete | Low |
| Double charge protection | ✅ Multi-layer | Low |
| Double intake protection | ✅ Idempotency key | Low |
| Correlation IDs | ⚠️ Partial | Medium |
| Post-payment fulfillment | ⚠️ Fire-and-forget | Medium |
| Sentry integration | ✅ Good | Low |

### Key Findings

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | Correlation ID not propagated to draft generation | MED | `webhook/route.ts:486` |
| 2 | AI draft timeout (30s) may hit serverless limits | MED | `webhook/route.ts:481` |
| 3 | No Sentry breadcrumbs for webhook step progression | LOW | `webhook/route.ts` |
| 4 | Invoice system uses separate `invoices` table (not linked to intakes) | MED | `payment-history-content.tsx` |
| 5 | Retry payment URL in emails may break if intake deleted | LOW | `payment-failed.tsx` |
| 6 | Missing `stripe_payment_intent_id` on some intakes | MED | `webhook/route.ts:628` |
| 7 | DLQ retry uses internal fetch (cold start risk) | LOW | `webhook-dlq/route.ts:165` |
| 8 | No correlation ID in Stripe session metadata | MED | `checkout.ts:436-442` |

---

## 2. Payment Flow Trace

### Full Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: User Clicks Pay                                                      │
│                                                                               │
│  components/request/steps/checkout-step.tsx                                   │
│  └── handleCheckout() → calls createCheckoutFromUnifiedFlow()                │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Checkout Action                                                      │
│                                                                               │
│  app/actions/unified-checkout.ts → createCheckoutFromUnifiedFlow()           │
│  └── Transforms answers                                                       │
│  └── Calls createIntakeAndCheckoutAction() OR createGuestCheckoutAction()    │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Intake + Stripe Session Creation                                     │
│                                                                               │
│  lib/stripe/checkout.ts → createIntakeAndCheckoutAction()                    │
│  ├── 1. Service disabled check (kill switch)                                 │
│  ├── 2. Server-side validation (med cert, repeat script)                     │
│  ├── 3. Safety rule evaluation                                               │
│  ├── 4. Authentication check                                                 │
│  ├── 5. Idempotency key validation (≥16 chars, required)                     │
│  ├── 6. Rate limiting (RATE_LIMIT_SENSITIVE)                                 │
│  ├── 7. INSERT intakes (status=pending_payment, idempotency_key=unique)      │
│  ├── 8. Fraud detection checks                                               │
│  ├── 9. INSERT intake_answers                                                │
│  ├── 10. Link chat transcript (if chatSessionId provided)                    │
│  ├── 11. Get Stripe price ID                                                 │
│  └── 12. stripe.checkout.sessions.create()                                   │
│      └── metadata: { intake_id, patient_id, category, subtype }              │
│  └── 13. UPDATE intakes SET payment_id = session.id                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: User Completes Payment on Stripe Checkout                            │
│                                                                               │
│  → Stripe processes payment                                                   │
│  → Redirects to success_url with session_id                                  │
│  → Stripe sends webhook to /api/stripe/webhook                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Webhook Processing                                                   │
│                                                                               │
│  app/api/stripe/webhook/route.ts                                             │
│  ├── 1. Signature verification (stripe.webhooks.constructEvent)              │
│  ├── 2. ATOMIC IDEMPOTENCY: tryClaimEvent() → try_process_stripe_event RPC   │
│  │      └── INSERT stripe_webhook_events ON CONFLICT DO NOTHING              │
│  ├── 3. Extract intake_id from session.metadata                              │
│  ├── 4. Guard: Check if intake exists                                        │
│  │      └── If missing → addToDeadLetterQueue() + return 500 (Stripe retry)  │
│  ├── 5. Guard: Check if already paid                                         │
│  │      └── If paid → return { already_paid: true }                          │
│  ├── 6. UPDATE intakes SET status='paid', payment_status='paid', paid_at     │
│  │      └── WHERE id=$intakeId AND payment_status IN ('pending', 'unpaid')   │
│  ├── 7. Guard: Concurrent webhook check                                      │
│  │      └── If update failed but status is paid → return { concurrent: true }│
│  ├── 8. Save Stripe customer ID to profile (non-critical)                    │
│  ├── 9. Send payment notification (non-critical)                             │
│  ├── 10. Send guest account email (if guest checkout)                        │
│  └── 11. Generate AI drafts (fire-and-forget with 30s timeout)               │
│          └── If fails → queue to ai_draft_retry_queue                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: Post-Payment Fulfillment                                             │
│                                                                               │
│  app/actions/generate-drafts.ts → generateDraftsForIntake()                  │
│  ├── 1. Idempotency check: draftsExist() → skip if already generated         │
│  ├── 2. Fetch intake with answers and patient info                           │
│  ├── 3. Determine service type and draft category                            │
│  ├── 4. Generate clinical note draft (OpenAI gpt-4o-mini)                    │
│  ├── 5. Generate service-specific draft (med cert / repeat rx / consult)     │
│  ├── 6. Validate AI output with schema + ground-truth checks                 │
│  ├── 7. upsertDraft() → INSERT/UPDATE intake_drafts                          │
│  └── 8. Track in PostHog                                                     │
│                                                                               │
│  lib/notifications/service.ts → notifyPaymentReceived()                      │
│  └── Creates in-app notification (notifications table)                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Checkout action | `lib/stripe/checkout.ts` | Main checkout logic |
| Guest checkout | `lib/stripe/guest-checkout.ts` | Guest user flow |
| Webhook handler | `app/api/stripe/webhook/route.ts` | Payment confirmation |
| Draft generation | `app/actions/generate-drafts.ts` | AI draft creation |
| Notifications | `lib/notifications/service.ts` | In-app + email |
| Idempotency SQL | `supabase/migrations/20241215000003_stripe_idempotency.sql` | DB functions |

---

## 3. Double Charge / Double Intake Analysis

### Duplicate Charge Protection

| Layer | Mechanism | Location | Status |
|-------|-----------|----------|--------|
| **Client** | Idempotency key generated per submission | `checkout-step.tsx` | ✅ |
| **Server** | Idempotency key validation (≥16 chars) | `checkout.ts:284-293` | ✅ |
| **Database** | UNIQUE constraint on `intakes.idempotency_key` | Migration | ✅ |
| **Stripe** | Idempotency key passed to `sessions.create()` | `guest-checkout.ts:380` | ✅ (guest only) |
| **Webhook** | Atomic event claim via `try_process_stripe_event` | `webhook/route.ts:260` | ✅ |
| **Webhook** | Guard: `payment_status === 'paid'` check | `webhook/route.ts:340` | ✅ |
| **Webhook** | Guard: `WHERE payment_status IN ('pending', 'unpaid')` | `webhook/route.ts:358` | ✅ |

### Duplicate Intake Protection

```typescript
// checkout.ts:325-350
if (intakeError?.code === "23505" && input.idempotencyKey) {
  // Return existing intake instead of creating duplicate
  const { data: existingIntake } = await supabase
    .from("intakes")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .single()
  
  if (existingIntake) {
    // If already paid, redirect to success
    if (existingIntake.status !== "pending_payment") {
      return { success: true, intakeId: existingIntake.id, checkoutUrl: ... }
    }
    // Otherwise, existing intake can be used for new checkout session
  }
}
```

### ⚠️ Potential Gap: Authenticated Checkout Missing Stripe Idempotency

**Issue:** Guest checkout passes idempotency key to Stripe, but authenticated checkout does not.

```typescript
// guest-checkout.ts:379-381 ✅
session = await stripe.checkout.sessions.create(sessionParams, {
  idempotencyKey: `guest-checkout-${intake.id}`,
})

// checkout.ts:456 ❌
session = await stripe.checkout.sessions.create(sessionParams)
// No idempotencyKey passed
```

**Risk Level:** LOW — The database-level idempotency key provides sufficient protection, but adding Stripe-level idempotency would be defense-in-depth.

---

## 4. Webhook Security & DLQ

### Signature Verification

```typescript
// webhook/route.ts:233-238
try {
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
} catch (err) {
  log.error("Signature verification failed", {}, err)
  return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
}
```

**Status:** ✅ Properly implemented using `stripe.webhooks.constructEvent`

### Admin Replay Security

```typescript
// webhook/route.ts:202-217
if (isAdminReplay) {
  // Verify admin replay secret
  if (!adminReplaySecret || adminReplaySecret !== process.env.INTERNAL_API_SECRET) {
    log.warn("Invalid admin replay secret", { originalEventId })
    return NextResponse.json({ error: "Invalid replay credentials" }, { status: 401 })
  }
  // Parse payload without signature verification (already verified on first receipt)
}
```

**Status:** ✅ Admin replay protected by `INTERNAL_API_SECRET`

### Dead Letter Queue (DLQ) Handling

| Feature | Implementation | Location |
|---------|---------------|----------|
| DLQ insertion | `addToDeadLetterQueue()` | `webhook/route.ts:114-188` |
| Sentry alert on DLQ | `Sentry.captureMessage()` | `webhook/route.ts:137-151` |
| DLQ threshold alert | 5 items/hour triggers FATAL | `webhook/route.ts:161-179` |
| DLQ admin UI | `/admin/webhook-dlq` | `app/admin/webhook-dlq/page.tsx` |
| DLQ retry | POST with `X-Admin-Replay` header | `webhook-dlq/route.ts:164-199` |
| DLQ monitor cron | Daily check for stale items | `cron/dlq-monitor/route.ts` |
| Auto-resolve on retry | Marks as resolved if retry succeeds | `webhook-dlq/route.ts:180-188` |

### Max Retry Logic

```typescript
// webhook/route.ts:321-333
const retryCount = count || 0
const MAX_RETRIES = 3

// After MAX_RETRIES, stop asking Stripe to retry
if (retryCount >= MAX_RETRIES) {
  log.error("Max retries reached for missing intake - stopping retries", {...})
  return NextResponse.json({ 
    error: "Intake not found after max retries", 
    processed: true,  // ← Return 200 to stop Stripe retries
    dlq: true 
  }, { status: 200 })
}

// Return 500 to trigger Stripe retry if under limit
return NextResponse.json({ error: "Intake not found" }, { status: 500 })
```

**Status:** ✅ Prevents 72-hour retry storms while preserving DLQ for manual resolution

---

## 5. Observability Analysis

### Sentry Integration

| Event Type | Captured | Location |
|------------|----------|----------|
| Webhook DLQ addition | ✅ `captureMessage` (error) | `webhook/route.ts:137` |
| DLQ threshold exceeded | ✅ `captureMessage` (fatal) | `webhook/route.ts:163` |
| Unexpected webhook error | ✅ `captureException` | `webhook/route.ts:533` |
| DLQ insert failure | ✅ `captureException` | `webhook/route.ts:183` |
| Dispute created | ✅ `captureMessage` (error) | `webhook/route.ts:839` |
| Unknown service type | ✅ `captureMessage` (warning) | `generate-drafts.ts:242` |

### Correlation ID Analysis

**Existing Implementation:** `lib/observability/correlation.ts`
- Generates correlation IDs in format `{timestamp}-{random}`
- Can extract from Stripe event ID: `stripe-{event.id}`
- Provides `withCorrelation()` wrapper for traced operations

**⚠️ Gap: Correlation ID not consistently propagated**

| Flow Segment | Correlation ID | Status |
|--------------|---------------|--------|
| Checkout creation | ❌ Not used | Missing |
| Webhook entry | ✅ Event ID logged | Partial |
| Webhook → Draft generation | ❌ Not passed | **Missing** |
| Webhook → Notification | ❌ Not passed | Missing |
| AI draft generation | ❌ Only `intakeId` | Missing |

### Missing Sentry Breadcrumbs

The webhook handler logs to console but doesn't add Sentry breadcrumbs for step progression:

```typescript
// Current: Only final errors are captured
log.info("Intake updated to paid", {...})  // Console only

// Recommended: Add breadcrumbs for debugging failed webhooks
Sentry.addBreadcrumb({
  category: 'webhook',
  message: 'Intake updated to paid',
  data: { intakeId, sessionId },
  level: 'info',
})
```

---

## 6. Retry Payment Flow

### Implementation

```typescript
// lib/stripe/checkout.ts:530-668 — retryPaymentForIntakeAction()
```

| Step | Implementation | Status |
|------|---------------|--------|
| Auth check | `getAuthenticatedUserWithProfile()` | ✅ |
| Ownership check | `WHERE patient_id = $patientId` | ✅ |
| Status check | `status === 'pending_payment'` | ✅ |
| Safety re-validation | `checkSafetyForServer()` | ✅ |
| Expire old session | `stripe.checkout.sessions.expire()` | ✅ |
| Price consistency | Uses stored `stripe_price_id` if available | ✅ |
| New session creation | Creates fresh Stripe checkout | ✅ |
| Update payment_id | Overwrites with new session ID | ✅ |

### ⚠️ Gap: Old Session Expiry Failure Handling

```typescript
// checkout.ts:588-600
if (intake.payment_id) {
  try {
    await stripe.checkout.sessions.expire(intake.payment_id)
  } catch (expireError) {
    // Session may already be expired or completed, that's okay
    logger.debug("Could not expire previous session", {...})
  }
}
```

**Status:** Acceptable — Failure to expire is logged but doesn't block retry. However, if the old session was somehow still valid, user could complete payment on both.

**Risk:** LOW — Stripe enforces single payment per session, and our `payment_status` guard prevents double fulfillment.

---

## 7. Invoice Download & History

### Implementation

| Component | File | Purpose |
|-----------|------|---------|
| UI | `components/patient/payment-history-content.tsx` | Invoice list + download |
| Get invoices | `app/api/patient/get-invoices/route.ts` | Fetch from `invoices` table |
| Download PDF | `app/api/patient/download-invoice/route.ts` | Storage bucket access |
| Retry payment | `app/api/patient/retry-payment/route.ts` | Invoice-based retry |

### ⚠️ Gap: Invoice Table Separate from Intakes

The `invoices` table appears to be a **separate system** from the `intakes` table:

```typescript
// payment-history-content.tsx uses:
const response = await fetch("/api/patient/get-invoices")
// → queries "invoices" table

// But payments are tracked on:
// intakes.payment_status, intakes.paid_at, intakes.payment_id
```

**Impact:** 
- Invoice history may not reflect all paid intakes
- Retry payment via invoice table uses different flow than `retryPaymentForIntakeAction`

**Risk Level:** MEDIUM — Potential data inconsistency between invoices and intakes.

---

## 8. Recommendations

### HIGH Priority

#### 1. Add Stripe Idempotency Key to Authenticated Checkout
**File:** `lib/stripe/checkout.ts:456`  
**Issue:** Guest checkout passes idempotency key to Stripe, authenticated does not.  
**Fix:**
```typescript
session = await stripe.checkout.sessions.create(sessionParams, {
  idempotencyKey: `checkout-${intake.id}`,
})
```
**Risk:** HIGH — Defense-in-depth against double charges.

---

#### 2. Store `stripe_payment_intent_id` on Intake After Webhook
**File:** `app/api/stripe/webhook/route.ts:348-360`  
**Issue:** Refund lookup fails because `stripe_payment_intent_id` not stored.  
**Fix:**
```typescript
const { error: intakeError } = await supabase
  .from("intakes")
  .update({
    payment_status: "paid",
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: session.payment_intent,  // ADD THIS
    updated_at: new Date().toISOString(),
  })
  .eq("id", intakeId)
```
**Risk:** HIGH — Enables reliable refund tracking.

---

### MEDIUM Priority

#### 3. Propagate Correlation ID Through Webhook → Draft Flow
**File:** `app/api/stripe/webhook/route.ts:486`  
**Issue:** Draft generation has no correlation to webhook event.  
**Fix:**
```typescript
const correlationId = `stripe-${event.id}`

Promise.race([
  generateDraftsForIntake(intakeId, false, correlationId),
  timeoutPromise
])
```
And update `generateDraftsForIntake` signature to accept optional `correlationId`.

**Risk:** MEDIUM — Improves debugging of draft failures.

---

#### 4. Add Correlation ID to Stripe Session Metadata
**File:** `lib/stripe/checkout.ts:436-442`  
**Issue:** No way to correlate checkout creation with webhook.  
**Fix:**
```typescript
metadata: {
  intake_id: intake.id,
  patient_id: patientId,
  category: input.category,
  subtype: input.subtype,
  service_slug: serviceSlug,
  correlation_id: generateCorrelationId(),  // ADD THIS
}
```
**Risk:** MEDIUM — Enables end-to-end tracing.

---

#### 5. Reconcile Invoice Table with Intakes
**File:** `app/api/patient/get-invoices/route.ts`  
**Issue:** `invoices` table may be out of sync with `intakes`.  
**Fix:** Either:
- (A) Generate invoices from `intakes` table with `payment_status = 'paid'`
- (B) Create invoice record in webhook after successful payment

**Risk:** MEDIUM — Data consistency for patient billing history.

---

### LOW Priority

#### 6. Add Sentry Breadcrumbs to Webhook Handler
**File:** `app/api/stripe/webhook/route.ts`  
**Issue:** Hard to debug partial webhook failures.  
**Fix:**
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.addBreadcrumb({
  category: 'stripe-webhook',
  message: 'Processing checkout.session.completed',
  data: { eventId: event.id, intakeId, sessionId: session.id },
  level: 'info',
})
```
**Risk:** LOW — Improves debugging.

---

#### 7. Reduce AI Draft Timeout Risk
**File:** `app/api/stripe/webhook/route.ts:481`  
**Issue:** 30s timeout may hit Vercel serverless limits (default 10s, max 60s).  
**Fix:** Already has retry queue (`ai_draft_retry_queue`), but consider:
- Reducing timeout to 15s
- Moving draft generation to dedicated background worker
- Using Vercel Functions with extended timeout

**Risk:** LOW — Existing retry mechanism handles failures.

---

#### 8. Use Server Action Instead of Internal Fetch for DLQ Retry
**File:** `app/api/admin/webhook-dlq/route.ts:165`  
**Issue:** Internal fetch may hit cold start latency.  
**Fix:**
```typescript
// Instead of fetch(), call webhook handler directly
const result = await processWebhookEvent(entry.payload, true /* isReplay */)
```
**Risk:** LOW — Current implementation works, just suboptimal.

---

## Summary

| Priority | Count | Items |
|----------|-------|-------|
| **HIGH** | 2 | Stripe idempotency key, payment_intent_id storage |
| **MEDIUM** | 3 | Correlation IDs (2), Invoice reconciliation |
| **LOW** | 3 | Sentry breadcrumbs, AI timeout, DLQ retry method |

**Overall:** The checkout and payment system is **production-ready** with robust duplicate protection. The recommendations are defense-in-depth improvements rather than critical fixes. The highest-priority items are:

1. **Add Stripe-level idempotency** to authenticated checkout
2. **Store `stripe_payment_intent_id`** for reliable refund tracking
