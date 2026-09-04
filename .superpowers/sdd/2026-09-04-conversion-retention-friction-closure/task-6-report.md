# Task 6 report — checkout failure taxonomy and paid recovery

## Outcome

Implemented a fixed, server-owned checkout failure taxonomy and an aggregate-only PostHog recovery read model on the existing Business surface. Authenticated checkout, guest checkout, recovered and duplicate requests, missing Checkout URLs, retry payment, and outer exceptions now return one discriminated `CheckoutResult`; the browser records only the fixed category, code, and taxonomy version. Payment, identity, safety-completeness, clinical, idempotency, and current-Stripe-session guards remain unchanged.

No production source was queried or mutated, no patient-level value was written to an artifact, and no deployment, credential, migration, refund, or Ads action was performed.

## Changes

- Added taxonomy `checkout_v2_20260905` with the required nine fixed failure codes mapped onto the existing eight stable failure categories. `auth_handoff` is reserved for a future verified handoff and is not inferred from account existence or public error copy.
- Made checkout success and failure a discriminated union. Success requires both `checkoutUrl` and `intakeId`; failure requires patient-facing copy plus a fixed category, code, and version. Internal checkout pipeline failures also require a typed code.
- Routed every authenticated, guest, saved-draft, duplicate/rebuild, missing-URL, retry-payment, and unclassified-exception failure producer through the central factory. Deterministic branches use deterministic codes; only outer exception catches use `unexpected`.
- Changed `review-step.tsx` to use the server-returned allowlisted dimensions. It never classifies raw error strings, and neither public copy nor provider/database errors are sent to PostHog. Both failure branches use the existing retrying `capture()` path rather than the nullable React PostHog client; navigation behavior remains non-blocking and there is exactly one capture per failure branch.
- Extended the PostHog privacy boundary to retain only allowlisted failure categories, codes, and the exact taxonomy version. Email, patient/intake IDs, raw errors, messages, account-existence state, and free text remain excluded.
- Added a server-only, PHI-free PostHog reader for 7-day and 30-day event windows. It validates all provider row shapes and timestamps, rejects malformed/truncated/count-mismatched evidence, uses provider-compatible UTC `toDateTime64`, and emits no queries, credentials, flow IDs, or raw provider rows in the dashboard result.
- Recovery uses the first failure per valid UUID-v4 flow and only a strictly later server purchase. Same-time and earlier purchases do not recover a failure. Twenty-four-hour and seven-day rates use only horizon-mature eligible flows; younger failures remain explicitly in flight.
- Added aggregate category rows, flow-ID coverage, taxonomy coverage, typed unknown share, and separate `legacy_unclassified` and classified-but-unjoinable event counts. The view stays degraded before 20 typed failed flows, below 90% flow coverage, below 95% taxonomy coverage, or while typed unknown is 5% or higher.
- Embedded the compact aggregate table inside the existing canonical funnel card, preserving the five primary Business cards and the Operations boundary for live case recovery.
- Updated the architecture inventory from 1,356 to 1,360 `lib/` files; the existing mechanically checked count remains the owner of that bookkeeping fact.

## Strict TDD evidence

RED was observed before implementation:

1. The initial focused tests failed because `lib/stripe/checkout-failure.ts` and `lib/analytics/posthog-checkout-recovery.ts` did not exist.
2. The Business and privacy contracts failed because the recovery read, aggregate table, fixed dimensions, and durable failure capture were absent.
3. Existing payment-safety suites failed exact legacy result assertions after the discriminated failure fields were introduced; assertions were updated while preserving strict equality for success results.
4. An adversarial exact-count test failed because `Number(null)` silently converted malformed provider evidence to zero. Validation now rejects null and non-integer count shapes before reconciliation.
5. The first full suite exposed the expected generated architecture count drift from the four new `lib/` files and one incomplete strict success expectation. Both were corrected without changing runtime behavior.

Final focused GREEN:

```text
corepack pnpm exec vitest run \
  lib/__tests__/checkout-failure-code.test.ts \
  lib/__tests__/posthog-checkout-recovery.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts \
  lib/__tests__/intake-draft-lifecycle.test.ts \
  lib/__tests__/stripe-checkout-retry.test.ts \
  lib/__tests__/stripe/checkout-operating-hours.test.ts \
  lib/__tests__/checkout-safety-ordering.test.ts

Test Files  8 passed (8)
Tests       169 passed (169)
```

Additional checkout and attribution contracts:

```text
Test Files  8 passed (8)
Tests       102 passed (102)
```

## Full verification

```text
corepack pnpm test
Test Files  734 passed (734)
Tests       6910 passed (6910)

corepack pnpm typecheck
exit 0

corepack pnpm exec eslint --max-warnings 0 <Task 6 TypeScript/TSX paths>
exit 0

corepack pnpm doc:audit
Test Files  10 passed (10)
Tests       124 passed (124)
doc:audit passed

git diff --check
exit 0
```

## Verification boundary and remaining evidence

Browser verification was not run against `/admin/analytics`: rendering the authenticated Business page with the available workspace environment would query configured external data sources, which this implementation task forbids. Placement, five-card preservation, aggregate-only labels, degraded/unavailable states, and the no-drilldown boundary are pinned by the Business dashboard contract. A clean authenticated browser pass remains a release verification step after deployment.

The recovery table intentionally does not claim a live recovery rate before real post-release evidence exists. Existing server-side PostHog project credentials are required for the read; missing, forbidden, timed-out, malformed, truncated, or count-mismatched evidence renders unavailable rather than zero. Valid but immature or under-covered evidence renders degraded. `/admin/ops` remains the only live case-recovery surface.
