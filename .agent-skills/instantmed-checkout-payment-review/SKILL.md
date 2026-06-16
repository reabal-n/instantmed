---
name: instantmed-checkout-payment-review
description: InstantMed checkout and payment safety workflow. Use when a task in /Users/rey/Developer/instantmed touches Stripe checkout, guest checkout, retry payment, payment_status, payment_id, stale Checkout Sessions, webhooks, refunds, decline refunds, price mapping, priority fee, checkout_failed recovery, intake lifecycle transitions, lib/stripe, app/api/stripe, app/actions/decline-refund.ts, or any money-moving path.
---

# InstantMed Checkout Payment Review

Use this for money-moving or payment-state work. The goal is to preserve payment correctness, safety checks before payment, refund invariants, and operator-visible recovery.

## Load Order

Read the smallest relevant set:

1. `AGENTS.md`, especially Pricing, Checkout safety enforcement, Gotchas, and Doc Maintenance Policy
2. `wiki/index.md`
3. `docs/ARCHITECTURE.md` payment, checkout, webhook, refund, and intake data flow sections
4. `docs/SECURITY.md` for PHI, audit logs, RLS, webhook signatures, or secrets
5. `docs/OPERATIONS.md` for incidents, Stripe, webhooks, DLQ, or recovery
6. `docs/TESTING.md` for E2E seams and production guards

## Trace The Payment Path

Map the change across:

1. Intake answers saved before payment.
2. `validateSafetyFieldsPresent()` before `checkSafetyForServer()`.
3. Authenticated checkout, guest checkout, and retry-payment paths.
4. Stripe Session creation, line items, metadata, and current stored `intakes.payment_id`.
5. Webhook handlers and fallback verification.
6. App-layer and DB-layer intake status transitions.
7. Refund creation, refund top-up, support caps, and audit logging.
8. Operator recovery surface in `/admin/ops` or linked pages.

## Invariants

- Never mark an intake paid from a stale Checkout Session.
- Never delete a clinically persisted intake just because Stripe setup failed; keep an operator-visible `checkout_failed` record.
- Missing safety-critical answers are `REQUEST_MORE_INFO`, not paid or declined.
- Refund on decline is full for med certs, repeat prescriptions, and consults.
- App status transitions and DB trigger transitions must change together.
- Tests that post fake signed Stripe events must never target production.
- Do not reintroduce invoice or subscription webhook behavior without a business-model decision update.

## Verification

Pick the narrowest proof:

- Unit/contract tests for pure logic and lifecycle changes.
- Focused E2E for checkout, guest checkout, retry-payment, webhook, or recovery flow.
- `pnpm typecheck` and `pnpm lint` for TypeScript changes.
- Browser check only when UI or operator recovery surfaces changed.

Report proof scope precisely: which path was exercised, which status changed, and which paths were not rerun.
