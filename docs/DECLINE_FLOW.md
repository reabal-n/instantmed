# Decline Flow - Hardened Implementation

## Overview

The decline flow ensures **consistent refund + email + audit** handling whenever an intake is declined. All decline operations use a single canonical action to prevent inconsistencies.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Decline Entry Points                      │
├─────────────────────────────────────────────────────────────┤
│  Doctor Queue UI  │  Admin Panel  │  API Route  │  Bulk     │
└─────────┬─────────┴───────┬───────┴──────┬──────┴─────┬─────┘
          │                 │              │            │
          └─────────────────┴──────────────┴────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  declineIntake()      │
                    │  (canonical action)   │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    ┌─────▼─────┐        ┌──────▼──────┐       ┌──────▼──────┐
    │  Status   │        │   Refund    │       │   Email     │
    │  Update   │        │  Processing │       │  + Audit    │
    └───────────┘        └─────────────┘       └─────────────┘
```

## Canonical Action

**File:** `app/actions/decline-intake.ts`

```typescript
import { declineIntake } from "@/app/actions/decline-intake"

const result = await declineIntake({
  intakeId: "...",
  reason: "Patient did not meet clinical criteria",
  reasonCode: "clinical_criteria",
  actorId: "...", // Optional - uses current user if not provided
})

if (result.success) {
  // result.refund?.status: "succeeded" | "failed" | "not_eligible" | "skipped_e2e"
  // result.emailSent: boolean
}
```

## Flow Steps

### 1. Validate Actor
- Requires doctor or admin role
- Can override with `actorId` for API key auth

### 2. Atomic Status Update
- Updates intake status to `declined`
- Sets `decision`, `decline_reason`, `decided_at`, `declined_at`
- Uses optimistic locking on status

### 3. Process Refund (if eligible)
- **Eligible categories:** `medical_certificate`, `prescription`
- **Not eligible:** `consult` (requires manual review)
- In E2E mode (`PLAYWRIGHT=1`), refund is marked `skipped_e2e`

### 4. Send Decline Email
- Uses `sendRequestDeclinedEmailNew()` 
- Logged to `email_outbox` table
- Non-blocking (decline succeeds even if email fails)

### 5. Log Audit Events
- `intake_events` table: status change with refund info
- `compliance_audit_log`: triage declined event

## Refund Status Tracking

**Migration:** `20260126220000_add_refund_tracking.sql`

New fields on `intakes` table:

| Field | Type | Description |
|-------|------|-------------|
| `refund_status` | enum | `not_applicable`, `not_eligible`, `pending`, `succeeded`, `failed`, `skipped_e2e` |
| `refund_error` | text | Error message if failed |
| `refund_stripe_id` | text | Stripe refund ID |
| `refunded_at` | timestamptz | When refund completed |
| `refunded_by` | uuid | Who initiated refund |

## Sentry Integration

When refund fails:

```typescript
Sentry.captureMessage(`Refund failed for declined intake`, {
  level: "error",
  tags: {
    action: "refund_on_decline",
    intake_id: intakeId,
    stripe_session_id: paymentId,
  },
  fingerprint: ["refund-failed", intakeId],
})
```

## Reconciliation Panel

Failed refunds automatically appear in the reconciliation panel:

- **File:** `lib/data/reconciliation.ts`
- **Query:** Fetches intakes where `refund_status = 'failed'`
- **UI:** Shows "Refund failed" in delivery details column

## Entry Points Updated

| Entry Point | File | Notes |
|-------------|------|-------|
| Doctor queue decline | `app/doctor/queue/actions.ts` | Uses `declineIntakeCanonical` |
| Admin decline route | `app/api/admin/decline/route.ts` | Uses `declineIntake` action |

## E2E Testing

**File:** `e2e/admin.decline-flow.spec.ts`

```bash
# Run decline flow tests
PLAYWRIGHT=1 pnpm e2e --grep "decline-flow"
```

### Test Cases

1. **decline action updates status** - Verifies status changes to declined
2. **declined intake shows refund indicator** - UI shows refund status
3. **decline creates email_outbox entry** - Email logged for audit
4. **failed refunds in reconciliation** - Reconciliation panel shows failures
5. **refund skipped in E2E mode** - Confirms E2E seam works

## Manual Refund Handling

For intakes where auto-refund failed:

1. Check reconciliation panel for failed refunds
2. Process refund manually in Stripe dashboard
3. Use `markAsRefundedAction()` to update intake status

```typescript
import { markAsRefundedAction } from "@/app/doctor/queue/actions"

await markAsRefundedAction(intakeId, "Manual refund processed", false)
```

## Troubleshooting

### Refund Failed - No Payment Intent

**Cause:** Checkout session expired or payment intent not stored

**Fix:** 
1. Look up payment in Stripe dashboard by customer email
2. Process refund manually
3. Update intake with `markAsRefundedAction`

### Email Not Sent

**Cause:** Email send failed but decline succeeded

**Fix:**
1. Check `email_outbox` for error
2. Manually send from admin panel or resend via retry queue

### Status Update Race Condition

**Cause:** Multiple users clicked decline simultaneously

**Fix:** Optimistic locking prevents double-decline. Refresh and retry.

## Files

| File | Purpose |
|------|---------|
| `app/actions/decline-intake.ts` | Canonical decline action |
| `supabase/migrations/20260126220000_add_refund_tracking.sql` | Refund tracking fields |
| `lib/data/reconciliation.ts` | Reconciliation queries (includes failed refunds) |
| `e2e/admin.decline-flow.spec.ts` | E2E tests |
| `e2e/helpers/db.ts` | Test helpers (`seedTestIntake`, `cleanupTestIntake`) |
