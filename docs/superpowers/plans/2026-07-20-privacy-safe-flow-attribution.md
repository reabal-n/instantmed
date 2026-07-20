# Privacy-Safe Flow Attribution Implementation Plan

> **Execution mode:** Implement inline with test-driven development. The design was
> approved by the operator on 2026-07-20.

**Goal:** Count conversion and friction by privacy-safe intake attempts while
keeping repeated interactions visible and adding no patient-facing restrictions.

**Architecture:** A random UUID follows one attempt across client drafts,
cross-device drafts, checkout, the intake row, Stripe metadata, and confirmed
purchase events. PostHog sanitization permits only a validated UUID. Funnel queries
use unique attempts and return raw occurrences separately.

## Task 1: Add the identifier primitive

**Files:**

- Create `lib/analytics/flow-instance.ts`
- Create `lib/__tests__/flow-instance.test.ts`

- [ ] Write failing tests for generation and normalization.
- [ ] Implement UUID generation and validation helpers.
- [ ] Run the focused test.

## Task 2: Persist the ID through request drafts

**Files:**

- Modify `components/request/store.ts`
- Modify `lib/request/draft-storage.ts`
- Modify `lib/request/server-draft.ts`
- Modify `app/api/draft/route.ts`
- Modify focused request-store/draft tests

- [ ] Write failing contract tests for fresh attempts, scoped drafts, reset, and
      legacy server-draft restoration.
- [ ] Add `flowInstanceId` to the request state and local draft payload.
- [ ] Add `flow_instance_id` to the server draft payload/record.
- [ ] Validate UUIDs at the API boundary.
- [ ] Confirm no clinical answer field contains the ID.

## Task 3: Carry the ID through analytics and checkout

**Files:**

- Modify `components/request/hooks/use-flow-analytics.ts`
- Modify `lib/analytics/intake-events.ts`
- Modify `components/request/steps/review-step.tsx`
- Modify `app/actions/unified-checkout.ts`
- Modify `lib/stripe/checkout/types.ts`
- Modify `lib/stripe/checkout/persistence.ts`
- Modify `lib/stripe/checkout/stripe-session.ts`
- Modify `lib/stripe/guest-checkout.ts`
- Modify focused checkout tests

- [ ] Write failing tests for event and checkout propagation.
- [ ] Add the ID to privacy-safe client funnel events.
- [ ] Pass it through authenticated and guest checkout.
- [ ] Persist it to the intake row and Stripe metadata.
- [ ] Preserve it when checkout safely resumes or retries.

## Task 4: Propagate confirmed purchases

**Files:**

- Modify `lib/stripe/confirmed-payment-finalization.ts`
- Modify `lib/stripe/checkout/retry-payment.ts`
- Modify `lib/analytics/posthog-server.ts`
- Modify focused payment finalization tests

- [ ] Write failing tests for payment, webhook, and purchase events.
- [ ] Read the persisted ID with Stripe metadata as a safe fallback.
- [ ] Keep the ID stable across payment retry.
- [ ] Ensure analytics failures remain non-blocking.

## Task 5: Enforce the privacy contract

**Files:**

- Modify `lib/analytics/posthog-privacy.ts`
- Modify `lib/__tests__/posthog-privacy.test.ts`

- [ ] Write failing tests that allow a valid `flow_instance_id`.
- [ ] Write failing tests that drop malformed IDs and prohibited identifiers.
- [ ] Implement the narrow sanitizer rule.

## Task 6: Count unique attempts and separate retries

**Files:**

- Modify `lib/analytics/posthog-intake-funnel.ts`
- Modify `lib/analytics/intake-funnel-summary.ts`
- Modify `app/admin/analytics/analytics-client.tsx`
- Modify focused funnel tests

- [ ] Write failing tests for unique attempt counts and raw occurrences.
- [ ] Query unique validated flow IDs with an approximate historical fallback.
- [ ] Use attempts for stage conversion, drop-off, and friction.
- [ ] Surface retry occurrences separately with clear staff-facing labels.
- [ ] Keep the existing dashboard layout and add no motion.

## Task 7: Add and apply nullable database columns

**Files:**

- Create a Supabase migration through `supabase migration new`

- [ ] Add nullable UUID columns to `partial_intakes` and `intakes`.
- [ ] Add column comments documenting the non-identifying purpose.
- [ ] Apply the migration before application deployment.
- [ ] Verify the columns and run Supabase security/performance advisors.

## Task 8: Verify and ship

- [ ] Run all focused tests.
- [ ] Run `corepack pnpm lint`.
- [ ] Run `corepack pnpm typecheck`.
- [ ] Run doc drift checks.
- [ ] Run `corepack pnpm release:check`.
- [ ] Verify `/admin/analytics` at desktop/mobile and light/dark in a browser.
- [ ] Commit, push, and open a draft PR with compliance and migration notes.
- [ ] Wait for hosted CI.
- [ ] Mark ready, merge, and verify production health/runtime errors.
