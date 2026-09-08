---
name: instantmed-checkout-payment-review
description: 'InstantMed payment changes: review checkout, retries, webhooks, refunds and payment-state transitions against the project contracts before editing.'
metadata:
  owner: Rey / instantmed
  scope: project:instantmed
  version: 1.0.0
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

## Scope and ownership

This workflow applies only to instantmed and its verified checkouts/worktrees. Confirm the project from its operating docs and Git root before applying it. Project doctrine owns product, brand, privacy and release requirements; shared skills supply techniques only. Resolve commands and project paths from the active checkout, not a fixed machine path.
